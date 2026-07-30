"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { useRouter } from "next/navigation";

type WithdrawRow = {
  id: string;
  user_id: string;
  amount: number | string;
  pix_key: string | null;
  status: string | null;
  created_at: string;
  profile?: {
    name: string | null;
    whatsapp: string | null;
  } | null;
  affiliate?: {
    code: string | null;
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

function waLink(phone?: string | null, text?: string) {
  const digits = onlyDigits(phone || "");
  if (!digits) return null;
  const n = digits.startsWith("55") ? digits : `55${digits}`;
  const base = `https://wa.me/${n}`;
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}

export default function AffiliatePaymentsPage() {
  const router = useRouter();

  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [rows, setRows] = useState<WithdrawRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "paid">("pending");

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

    const adminMasterEmail = (process.env.NEXT_PUBLIC_ADMIN_MASTER_EMAIL || "")
      .trim()
      .toLowerCase();

    const currentEmail = String(user.email || "").trim().toLowerCase();

    if (!adminMasterEmail || currentEmail !== adminMasterEmail) {
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
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMsg(error.message || "Erro ao carregar pagamentos.");
      setRows([]);
      setLoading(false);
      return;
    }

    const baseRows = (data || []) as any[];

    if (baseRows.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    const userIds = Array.from(
      new Set(baseRows.map((r) => r.user_id).filter(Boolean))
    ) as string[];

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, name, whatsapp")
      .in("user_id", userIds);

    const { data: affiliatesData } = await supabase
      .from("affiliates")
      .select("user_id, code")
      .in("user_id", userIds);

    const profileMap = new Map<
      string,
      { name: string | null; whatsapp: string | null }
    >();

    ((profilesData as any[]) || []).forEach((p) => {
      profileMap.set(p.user_id, {
        name: p.name || null,
        whatsapp: p.whatsapp || null,
      });
    });

    const affiliateMap = new Map<string, { code: string | null }>();
    ((affiliatesData as any[]) || []).forEach((a) => {
      affiliateMap.set(a.user_id, {
        code: a.code || null,
      });
    });

    const finalRows: WithdrawRow[] = baseRows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      amount: Number(r.amount || 0),
      pix_key: r.pix_key || null,
      status: r.status || null,
      created_at: r.created_at,
      profile: profileMap.get(r.user_id) || null,
      affiliate: affiliateMap.get(r.user_id) || null,
    }));

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
      setMsg(error.message || "Erro ao marcar como pago.");
      setUpdatingId(null);
      return;
    }

    setMsg("Pagamento marcado como pago.");
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

    const total = rows.reduce((acc, r) => acc + Number(r.amount || 0), 0);

    return { pending, paid, total };
  }, [rows]);

  const ranking = useMemo(() => {
    const map = new Map<
      string,
      {
        user_id: string;
        name: string;
        code: string;
        total: number;
        whatsapp: string | null;
      }
    >();

    rows.forEach((r) => {
      const key = r.user_id;
      const current = map.get(key);

      const name =
        r.profile?.name ||
        r.affiliate?.code ||
        "Afiliado";

      const code = r.affiliate?.code || "Sem código";
      const whatsapp = r.profile?.whatsapp || null;
      const amount = Number(r.amount || 0);

      if (!current) {
        map.set(key, {
          user_id: key,
          name,
          code,
          total: amount,
          whatsapp,
        });
      } else {
        current.total += amount;
      }
    });

    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [rows]);

  const filterButtonClass = (active: boolean) =>
    active
      ? "pl-btn pl-btn-primary px-4 py-2 text-sm"
      : "pl-btn px-4 py-2 text-sm";

  if (checkingAdmin) {
    return (
      <main className="pl-page mx-auto w-full max-w-7xl px-4 py-8">
        <div className="pl-card p-6 text-[var(--panel-muted)]">
          Verificando acesso...
        </div>
      </main>
    );
  }

  return (
    <main className="pl-page mx-auto w-full max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--panel-ink)]">Pagamentos de Afiliados</h1>
          <p className="mt-1 text-sm font-semibold text-[var(--panel-muted)]">
            Gerencie pedidos de saque, chaves PIX e pagamentos dos afiliados.
          </p>
        </div>

        <button
          onClick={load}
          className="pl-btn px-4 py-2 text-sm"
        >
          Atualizar
        </button>
      </div>

      {msg ? (
        <div className="mb-5 rounded-xl border border-[var(--panel-ok-line)] bg-[var(--panel-ok-bg)] px-4 py-3 text-sm font-semibold text-[var(--panel-ok-text)]">
          {msg}
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 lg:grid-cols-4">
        <div className="pl-card-soft p-5">
          <div className="text-sm font-bold text-[var(--panel-muted)]">Total a pagar</div>
          <div className="mt-2 text-3xl font-black text-[var(--panel-warn-text)]">
            {money(totals.pending)}
          </div>
        </div>

        <div className="pl-card-soft p-5">
          <div className="text-sm font-bold text-[var(--panel-muted)]">Total pago</div>
          <div className="mt-2 text-3xl font-black text-[var(--panel-ok-text)]">
            {money(totals.paid)}
          </div>
        </div>

        <div className="pl-card-soft p-5">
          <div className="text-sm font-bold text-[var(--panel-muted)]">Total geral</div>
          <div className="mt-2 text-3xl font-black text-[var(--panel-ink)]">
            {money(totals.total)}
          </div>
        </div>

        <div className="pl-card-soft p-5">
          <div className="text-sm font-bold text-[var(--panel-muted)]">Pedidos</div>
          <div className="mt-2 text-3xl font-black text-[var(--panel-ink)]">
            {rows.length}
          </div>
        </div>
      </div>

      <div className="pl-card mb-6 p-5">
        <div className="mb-4 text-sm font-black text-[var(--panel-ink)]">Ranking de afiliados</div>

        {ranking.length === 0 ? (
          <div className="text-sm font-semibold text-[var(--panel-muted)]">Nenhum afiliado com solicitações ainda.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {ranking.map((item, index) => {
              const autoWa = waLink(
                item.whatsapp,
                `Olá! Seu total acumulado em solicitações de saque está em ${money(
                  item.total
                )}.`
              );

              return (
                <div
                  key={item.user_id}
                  className="rounded-2xl border border-[var(--panel-line)] bg-[var(--panel-surface)] p-4"
                >
                  <div className="text-xs font-semibold text-[var(--panel-muted)]">#{index + 1} no ranking</div>
                  <div className="mt-2 truncate font-black text-[var(--panel-ink)]">
                    {item.name}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-[var(--panel-muted)]">{item.code}</div>
                  <div className="mt-3 text-xl font-black text-[var(--panel-warn-text)]">
                    {money(item.total)}
                  </div>

                  {autoWa ? (
                    <a
                      href={autoWa}
                      target="_blank"
                      rel="noreferrer"
                      className="pl-btn pl-btn-primary mt-4 px-3 py-2 text-xs"
                    >
                      WhatsApp automático
                    </a>
                  ) : (
                    <div className="mt-4 text-xs font-semibold text-[var(--panel-muted)]">
                      Sem WhatsApp
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={filterButtonClass(filter === "all")}
        >
          Todos
        </button>

        <button
          onClick={() => setFilter("pending")}
          className={filterButtonClass(filter === "pending")}
        >
          Pendentes
        </button>

        <button
          onClick={() => setFilter("paid")}
          className={filterButtonClass(filter === "paid")}
        >
          Pagos
        </button>
      </div>

      <div className="pl-card p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[var(--panel-muted)]">
              <tr className="border-b border-[var(--panel-line)]">
                <th className="pb-3 text-left font-black">Data</th>
                <th className="pb-3 text-left font-black">Afiliado</th>
                <th className="pb-3 text-left font-black">WhatsApp</th>
                <th className="pb-3 text-left font-black">Chave PIX</th>
                <th className="pb-3 text-left font-black">Valor</th>
                <th className="pb-3 text-left font-black">Status</th>
                <th className="pb-3 text-left font-black">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[var(--panel-line)]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-6 font-semibold text-[var(--panel-muted)]">
                    Carregando...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 font-semibold text-[var(--panel-muted)]">
                    Nenhum pagamento encontrado.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => {
                  const paid = String(r.status || "").toLowerCase() === "paid";

                  const whatsappAuto = waLink(
                    r.profile?.whatsapp,
                    `Olá! Seu pedido de saque no valor de ${money(
                      Number(r.amount || 0)
                    )} está em análise${
                      paid ? " e já foi marcado como pago." : "."
                    }`
                  );

                  return (
                    <tr key={r.id} className="hover:bg-[var(--panel-hover)]">
                      <td className="py-3 font-semibold text-[var(--panel-muted)]">{fmtDate(r.created_at)}</td>

                      <td className="py-3">
                        <div className="font-black text-[var(--panel-ink)]">
                          {r.profile?.name || r.affiliate?.code || "Afiliado"}
                        </div>
                        <div className="text-[11px] font-semibold text-[var(--panel-muted)]">
                          {r.affiliate?.code ? `Código: ${r.affiliate.code}` : "Sem código"}
                        </div>
                      </td>

                      <td className="py-3">
                        {r.profile?.whatsapp ? (
                          <span className="font-black text-[var(--panel-ok-text)]">
                            {r.profile.whatsapp}
                          </span>
                        ) : (
                          <span className="font-semibold text-[var(--panel-muted)]">—</span>
                        )}
                      </td>

                      <td className="py-3">
                        {r.pix_key ? (
                          <div className="flex items-center gap-2">
                            <span className="max-w-[220px] truncate font-semibold text-[var(--panel-ink)]">
                              {r.pix_key}
                            </span>
                            <button
                              onClick={() => copyPixKey(r.pix_key)}
                              className="pl-btn px-2 py-1 text-xs"
                            >
                              Copiar
                            </button>
                          </div>
                        ) : (
                          <span className="font-semibold text-[var(--panel-muted)]">—</span>
                        )}
                      </td>

                      <td className="py-3 font-black text-[var(--panel-ink)]">
                        {money(Number(r.amount || 0))}
                      </td>

                      <td className="py-3">
                        {paid ? (
                          <span className="pl-badge pl-badge-ok py-1">
                            Pago
                          </span>
                        ) : (
                          <span className="pl-badge pl-badge-warn py-1">
                            Pendente
                          </span>
                        )}
                      </td>

                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          {whatsappAuto ? (
                            <a
                              href={whatsappAuto}
                              target="_blank"
                              rel="noreferrer"
                              className="pl-btn pl-btn-primary px-3 py-1 text-xs"
                            >
                              WhatsApp automático
                            </a>
                          ) : null}

                          {!paid ? (
                            <button
                              onClick={() => markAsPaid(r.id)}
                              disabled={updatingId === r.id}
                              className="pl-btn pl-btn-primary px-3 py-1 text-xs disabled:opacity-60"
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
