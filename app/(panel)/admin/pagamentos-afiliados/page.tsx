"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { useRouter } from "next/navigation";

type Row = {
  id: string;
  affiliate_id: string;
  amount: number | string;
  pix_key: string | null;
  status: string | null;
  created_at: string;
  affiliate?: {
    user_id: string;
    code: string | null;
  } | null;
  profile?: {
    email: string | null;
    whatsapp: string | null;
    name: string | null;
  } | null;
};

function money(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function fmtDate(v: string) {
  try {
    return new Date(v).toLocaleString("pt-BR");
  } catch {
    return v;
  }
}

function onlyDigits(v: string) {
  return String(v || "").replace(/\D/g, "");
}

function waLink(phone?: string | null) {
  const digits = onlyDigits(phone || "");
  if (!digits) return null;
  const n = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${n}`;
}

export default function AffiliatePaymentsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "paid">("pending");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  async function checkAdminAndLoad() {
    setCheckingAdmin(true);
    setMsg(null);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: adminRow, error: adminErr } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminErr || !adminRow) {
      router.push("/dashboard");
      return;
    }

    setCheckingAdmin(false);
    await load();
  }

  async function load() {
    setLoading(true);
    setMsg(null);

    const { data, error } = await supabase
      .from("affiliate_withdraw_requests")
      .select("id, affiliate_id, amount, pix_key, status, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setMsg(error.message || "Erro ao carregar pagamentos.");
      setRows([]);
      setLoading(false);
      return;
    }

    const baseRows = ((data as any[]) || []) as Row[];

    const affiliateIds = Array.from(
      new Set(baseRows.map((r) => r.affiliate_id).filter(Boolean))
    );

    let affiliateMap = new Map<string, { user_id: string; code: string | null }>();
    if (affiliateIds.length > 0) {
      const { data: affiliatesData } = await supabase
        .from("affiliates")
        .select("id, user_id, code")
        .in("id", affiliateIds);

      affiliateMap = new Map(
        ((affiliatesData as any[]) || []).map((a) => [
          a.id,
          { user_id: a.user_id, code: a.code || null },
        ])
      );
    }

    const userIds = Array.from(
      new Set(
        baseRows
          .map((r) => affiliateMap.get(r.affiliate_id)?.user_id)
          .filter(Boolean)
      )
    ) as string[];

    let profileMap = new Map<
      string,
      { email: string | null; whatsapp: string | null; name: string | null }
    >();

    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, name, whatsapp")
        .in("user_id", userIds);

      const profileRows = (profilesData as any[]) || [];

      const { data: authUser } = await supabase.auth.getUser();
      const currentUser = authUser?.user;

      // Como o supabaseBrowser não acessa auth.admin, vamos preencher email via view se existir
      const { data: emailsData } = await supabase
        .from("sites_with_user_email")
        .select("user_id, user_email")
        .in("user_id", userIds);

      const emailMap = new Map<string, string | null>();
      ((emailsData as any[]) || []).forEach((e) => {
        if (!emailMap.has(e.user_id)) emailMap.set(e.user_id, e.user_email || null);
      });

      // fallback para usuário atual
      if (currentUser?.id && currentUser?.email && !emailMap.has(currentUser.id)) {
        emailMap.set(currentUser.id, currentUser.email);
      }

      profileMap = new Map(
        profileRows.map((p) => [
          p.user_id,
          {
            email: emailMap.get(p.user_id) || null,
            whatsapp: p.whatsapp || null,
            name: p.name || null,
          },
        ])
      );
    }

    const finalRows: Row[] = baseRows.map((r) => {
      const affiliate = affiliateMap.get(r.affiliate_id) || null;
      const profile = affiliate?.user_id ? profileMap.get(affiliate.user_id) || null : null;
      return {
        ...r,
        affiliate,
        profile,
      };
    });

    setRows(finalRows);
    setLoading(false);
  }

  async function markAsPaid(id: string) {
    setUpdatingId(id);
    setMsg(null);

    const { error } = await supabase
      .from("affiliate_withdraw_requests")
      .update({ status: "paid" })
      .eq("id", id);

    if (error) {
      setMsg(error.message || "Erro ao marcar pagamento como pago.");
      setUpdatingId(null);
      return;
    }

    await load();
    setUpdatingId(null);
  }

  async function copyPixKey(key: string | null) {
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      setMsg("Chave PIX copiada!");
      setTimeout(() => setMsg(null), 1800);
    } catch {
      setMsg("Não foi possível copiar a chave PIX.");
    }
  }

  const filteredRows = useMemo(() => {
    if (filter === "pending") {
      return rows.filter((r) => String(r.status || "").toLowerCase() !== "paid");
    }
    if (filter === "paid") {
      return rows.filter((r) => String(r.status || "").toLowerCase() === "paid");
    }
    return rows;
  }, [rows, filter]);

  const totals = useMemo(() => {
    const pending = rows
      .filter((r) => String(r.status || "").toLowerCase() !== "paid")
      .reduce((acc, r) => acc + Number(r.amount || 0), 0);

    const paid = rows
      .filter((r) => String(r.status || "").toLowerCase() === "paid")
      .reduce((acc, r) => acc + Number(r.amount || 0), 0);

    return { pending, paid, total: pending + paid };
  }, [rows]);

  if (checkingAdmin) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-8 text-white">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
          Verificando acesso...
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 text-white">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pagamentos de Afiliados</h1>
          <p className="mt-1 text-sm text-white/60">
            Gerencie pedidos de saque, chaves PIX e pagamentos dos afiliados.
          </p>
        </div>

        <button
          onClick={load}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
        >
          Atualizar
        </button>
      </div>

      {msg ? (
        <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {msg}
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-white/60">Total pendente</div>
          <div className="mt-2 text-3xl font-bold text-amber-300">
            {money(totals.pending)}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-white/60">Total pago</div>
          <div className="mt-2 text-3xl font-bold text-emerald-300">
            {money(totals.paid)}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-white/60">Total geral</div>
          <div className="mt-2 text-3xl font-bold text-white">
            {money(totals.total)}
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold ${
            filter === "all"
              ? "bg-violet-600 text-white"
              : "border border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
          }`}
        >
          Todos
        </button>

        <button
          onClick={() => setFilter("pending")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold ${
            filter === "pending"
              ? "bg-violet-600 text-white"
              : "border border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
          }`}
        >
          Pendentes
        </button>

        <button
          onClick={() => setFilter("paid")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold ${
            filter === "paid"
              ? "bg-violet-600 text-white"
              : "border border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
          }`}
        >
          Pagos
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-white/60">
              <tr className="border-b border-white/10">
                <th className="pb-3 text-left font-medium">Data</th>
                <th className="pb-3 text-left font-medium">Afiliado</th>
                <th className="pb-3 text-left font-medium">WhatsApp</th>
                <th className="pb-3 text-left font-medium">Chave PIX</th>
                <th className="pb-3 text-left font-medium">Valor</th>
                <th className="pb-3 text-left font-medium">Status</th>
                <th className="pb-3 text-left font-medium">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-6 text-white/60">
                    Carregando...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-white/60">
                    Nenhum pagamento encontrado.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => {
                  const paid = String(r.status || "").toLowerCase() === "paid";
                  const whatsappHref = waLink(r.profile?.whatsapp);

                  return (
                    <tr key={r.id} className="hover:bg-white/5">
                      <td className="py-3 text-white/70">{fmtDate(r.created_at)}</td>

                      <td className="py-3">
                        <div className="font-semibold text-white/90">
                          {r.profile?.email || r.profile?.name || "Afiliado"}
                        </div>
                        <div className="text-[11px] text-white/40">
                          {r.affiliate?.code ? `Código: ${r.affiliate.code}` : "Sem código"}
                        </div>
                      </td>

                      <td className="py-3">
                        {r.profile?.whatsapp ? (
                          <span className="font-semibold text-emerald-300">
                            {r.profile.whatsapp}
                          </span>
                        ) : (
                          <span className="text-white/40">—</span>
                        )}
                      </td>

                      <td className="py-3">
                        {r.pix_key ? (
                          <div className="flex items-center gap-2">
                            <span className="max-w-[220px] truncate text-white/90">
                              {r.pix_key}
                            </span>
                            <button
                              onClick={() => copyPixKey(r.pix_key)}
                              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
                            >
                              Copiar
                            </button>
                          </div>
                        ) : (
                          <span className="text-white/40">—</span>
                        )}
                      </td>

                      <td className="py-3 font-semibold text-white">
                        {money(Number(r.amount || 0))}
                      </td>

                      <td className="py-3">
                        {paid ? (
                          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                            Pago
                          </span>
                        ) : (
                          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-200">
                            Pendente
                          </span>
                        )}
                      </td>

                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          {whatsappHref ? (
                            <a
                              href={whatsappHref}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
                            >
                              WhatsApp
                            </a>
                          ) : null}

                          {!paid ? (
                            <button
                              onClick={() => markAsPaid(r.id)}
                              disabled={updatingId === r.id}
                              className="rounded-lg bg-violet-600 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
                            >
                              {updatingId === r.id ? "Salvando..." : "Marcar pago"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}