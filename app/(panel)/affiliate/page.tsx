"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

type Affiliate = {
  user_id: string;
  code: string;
  commission_rate: number;
  is_active: boolean;
  created_at: string;
};

type Commission = {
  id: string;
  amount_cents: number;
  status: "pending" | "approved" | "paid" | "canceled" | string;
  created_at: string;
  referred_user_id: string | null;
  order_id: string | null;
};

type Withdraw = {
  id: string;
  amount_cents: number;
  pix_key: string;
  pix_key_type: "cpf" | "cnpj" | "email" | "phone" | "random" | string;
  status: "requested" | "approved" | "paid" | "rejected" | string;
  created_at: string;
  updated_at: string;
};

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

function normalizeStatus(status: string) {
  return String(status || "").trim().toLowerCase();
}

function statusLabel(status: string) {
  const s = normalizeStatus(status);

  // comissões
  if (s === "paid") return "Pago";
  if (s === "approved") return "Aprovado";
  if (s === "pending") return "Pendente";
  if (s === "canceled") return "Cancelado";

  // saques
  if (s === "requested") return "Solicitado";
  if (s === "rejected") return "Rejeitado";

  // fallback
  return status || "-";
}

function statusBadge(status: string) {
  const s = normalizeStatus(status);

  // ✅ cores padronizadas:
  // pago = verde
  if (s === "paid") return "bg-emerald-500/15 text-emerald-200 border-emerald-500/25";

  // aprovado = azul
  if (s === "approved") return "bg-sky-500/15 text-sky-200 border-sky-500/25";

  // pendente / solicitado = amarelo
  if (s === "pending" || s === "requested") return "bg-amber-500/15 text-amber-200 border-amber-500/25";

  // cancelado / rejeitado = vermelho
  if (s === "canceled" || s === "rejected") return "bg-red-500/15 text-red-200 border-red-500/25";

  return "bg-white/10 text-white/70 border-white/10";
}

export default function AffiliatePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [withdraws, setWithdraws] = useState<Withdraw[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  // Form saque
  const [pixKey, setPixKey] = useState("");
  const [pixType, setPixType] = useState<Withdraw["pix_key_type"]>("random");
  const [amountBRL, setAmountBRL] = useState("");
  const [reqLoading, setReqLoading] = useState(false);

  const appBase = useMemo(() => {
    // Se existir, usa env; se não, cai no domínio fixo
    const envUrl = (process.env.NEXT_PUBLIC_APP_URL || "").trim();
    return envUrl || "https://plpainel.com";
  }, []);

  const totals = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let paid = 0;
    let canceled = 0;

    for (const c of commissions) {
      const v = Number(c.amount_cents || 0);
      const s = normalizeStatus(c.status);
      if (s === "pending") pending += v;
      else if (s === "approved") approved += v;
      else if (s === "paid") paid += v;
      else if (s === "canceled") canceled += v;
    }

    // Saques já pagos / em análise
    let withdrawPaid = 0;
    let withdrawRequested = 0;

    for (const w of withdraws) {
      const v = Number(w.amount_cents || 0);
      const s = normalizeStatus(w.status);
      if (s === "paid") withdrawPaid += v;
      if (s === "requested" || s === "approved") withdrawRequested += v;
    }

    // Disponível (simples): aprovado - já pago em saque - em análise
    const available = Math.max(0, approved - withdrawPaid - withdrawRequested);

    return { pending, approved, paid, canceled, withdrawPaid, withdrawRequested, available };
  }, [commissions, withdraws]);

  async function load() {
    setMsg(null);
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      setLoading(false);
      router.push("/login");
      return;
    }

    const userId = auth.user.id;

    // affiliate
    const affRes = await supabase
      .from("affiliates")
      .select("user_id,code,commission_rate,is_active,created_at")
      .eq("user_id", userId)
      .maybeSingle<Affiliate>();

    if (affRes.error) {
      setLoading(false);
      setMsg(affRes.error.message);
      return;
    }

    setAffiliate(affRes.data ?? null);

    // commissions
    const commRes = await supabase
      .from("affiliate_commissions")
      .select("id,amount_cents,status,created_at,referred_user_id,order_id")
      .eq("affiliate_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);

    // withdraws
    const wdRes = await supabase
      .from("affiliate_withdraw_requests")
      .select("id,amount_cents,pix_key,pix_key_type,status,created_at,updated_at")
      .eq("affiliate_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (commRes.error) setMsg((p) => p ?? commRes.error!.message);
    if (wdRes.error) setMsg((p) => p ?? wdRes.error!.message);

    setCommissions((commRes.data as Commission[]) ?? []);
    setWithdraws((wdRes.data as Withdraw[]) ?? []);

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    alert("Copiado!");
  }

  async function requestWithdraw() {
    setMsg(null);

    if (!affiliate?.is_active) {
      setMsg("Seu afiliado está desativado. Fale com o suporte.");
      return;
    }

    const key = pixKey.trim();
    if (!key) return setMsg("Informe sua chave PIX.");

    // amount
    const amount = Number(String(amountBRL).replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) return setMsg("Informe um valor válido.");

    const cents = Math.round(amount * 100);

    // mínimo (ajusta se quiser)
    const minCents = 5000; // R$50,00
    if (cents < minCents) return setMsg(`Saque mínimo: ${money(minCents)}.`);

    if (cents > totals.available) {
      return setMsg(`Saldo disponível insuficiente. Disponível: ${money(totals.available)}.`);
    }

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      router.push("/login");
      return;
    }

    setReqLoading(true);
    try {
      const { error } = await supabase.from("affiliate_withdraw_requests").insert({
        affiliate_user_id: auth.user.id,
        amount_cents: cents,
        pix_key: key,
        pix_key_type: pixType,
        status: "requested",
      });

      if (error) {
        setMsg(error.message);
        return;
      }

      setPixKey("");
      setAmountBRL("");
      await load();
      alert("Pedido de saque enviado! Vamos analisar e pagar via PIX.");
    } finally {
      setReqLoading(false);
    }
  }

  // Link do afiliado -> login com ref
  const refLink = affiliate?.code
    ? `${appBase.replace(/\/$/, "")}/login?ref=${encodeURIComponent(affiliate.code)}`
    : "";

  return (
    <div className="space-y-6 text-white">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Afiliados</h1>
            <p className="mt-1 text-sm text-white/60">
              Acompanhe suas comissões e solicite saque via PIX.
            </p>
          </div>

          <button
            onClick={() => load()}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
          >
            Atualizar
          </button>
        </div>
      </div>

      {msg ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {msg}
        </div>
      ) : null}

      {!loading && !affiliate ? (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-5">
          <div className="text-sm font-semibold text-amber-200">Você ainda não é afiliado</div>
          <div className="mt-1 text-sm text-white/70">
            Fale com o administrador para ativar seu afiliado e gerar seu código.
          </div>
        </div>
      ) : null}

      {/* Link afiliado */}
      {affiliate ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-sm font-semibold">Seu código</div>
              <div className="mt-1 text-lg font-bold text-violet-200">{affiliate.code}</div>

              <div className="mt-2 text-xs text-white/60">
                Comissão padrão: {(Number(affiliate.commission_rate) * 100).toFixed(0)}%
              </div>

              <div className="mt-3 text-xs text-white/60">Seu link:</div>
              <div className="mt-1 break-all text-sm text-white/90">{refLink}</div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => copy(refLink)}
                  className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-black/30"
                >
                  Copiar link
                </button>
              </div>
            </div>

            <span
              className={`h-fit rounded-full border px-3 py-1 text-xs ${
                affiliate.is_active
                  ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/25"
                  : "bg-red-500/15 text-red-200 border-red-500/25"
              }`}
            >
              {affiliate.is_active ? "Ativo" : "Desativado"}
            </span>
          </div>
        </div>
      ) : null}

      {/* Resumo */}
      {affiliate ? (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs text-white/60">Disponível</div>
            <div className="mt-1 text-2xl font-bold">{money(totals.available)}</div>
            <div className="mt-1 text-[11px] text-white/50">
              (aprovado - saques em análise/pagos)
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs text-white/60">Pendente</div>
            <div className="mt-1 text-2xl font-bold">{money(totals.pending)}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs text-white/60">Aprovado</div>
            <div className="mt-1 text-2xl font-bold">{money(totals.approved)}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs text-white/60">Pago</div>
            <div className="mt-1 text-2xl font-bold">{money(totals.paid)}</div>
          </div>
        </div>
      ) : null}

      {/* Solicitar saque */}
      {affiliate ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-semibold">Solicitar saque (PIX)</div>
              <div className="mt-1 text-xs text-white/60">
                Saque mínimo: <b>R$ 50,00</b> • Disponível: <b>{money(totals.available)}</b>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs text-white/70">Tipo de chave</label>
              <select
                value={pixType}
                onChange={(e) => setPixType(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-white outline-none focus:border-violet-400"
              >
                <option value="random">Aleatória</option>
                <option value="cpf">CPF</option>
                <option value="cnpj">CNPJ</option>
                <option value="email">E-mail</option>
                <option value="phone">Telefone</option>
              </select>
            </div>

            <div className="md:col-span-1">
              <label className="text-xs text-white/70">Chave PIX</label>
              <input
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="Digite sua chave PIX"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-white outline-none focus:border-violet-400"
              />
            </div>

            <div>
              <label className="text-xs text-white/70">Valor (R$)</label>
              <input
                value={amountBRL}
                onChange={(e) => setAmountBRL(e.target.value)}
                placeholder="50.00"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-white outline-none focus:border-violet-400"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={requestWithdraw}
              disabled={reqLoading || !affiliate.is_active}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              {reqLoading ? "Enviando..." : "Solicitar saque"}
            </button>
          </div>
        </div>
      ) : null}

      {/* Tabelas */}
      {affiliate ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Comissões */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-base font-semibold">Comissões</div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-white/70">
                  <tr className="border-b border-white/10">
                    <th className="py-3 text-left font-medium">Data</th>
                    <th className="py-3 text-left font-medium">Valor</th>
                    <th className="py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {commissions.length === 0 ? (
                    <tr>
                      <td className="py-4 text-white/60" colSpan={3}>
                        Nenhuma comissão ainda.
                      </td>
                    </tr>
                  ) : (
                    commissions.map((c) => (
                      <tr key={c.id} className="hover:bg-white/5">
                        <td className="py-3 text-white/70">{fmt(c.created_at)}</td>
                        <td className="py-3">{money(Number(c.amount_cents || 0))}</td>
                        <td className="py-3">
                          <span className={`rounded-full border px-3 py-1 text-xs ${statusBadge(c.status)}`}>
                            {statusLabel(c.status)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Saques */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-base font-semibold">Saques</div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-white/70">
                  <tr className="border-b border-white/10">
                    <th className="py-3 text-left font-medium">Data</th>
                    <th className="py-3 text-left font-medium">Valor</th>
                    <th className="py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {withdraws.length === 0 ? (
                    <tr>
                      <td className="py-4 text-white/60" colSpan={3}>
                        Nenhum saque solicitado ainda.
                      </td>
                    </tr>
                  ) : (
                    withdraws.map((w) => (
                      <tr key={w.id} className="hover:bg-white/5">
                        <td className="py-3 text-white/70">{fmt(w.created_at)}</td>
                        <td className="py-3">{money(Number(w.amount_cents || 0))}</td>
                        <td className="py-3">
                          <span className={`rounded-full border px-3 py-1 text-xs ${statusBadge(w.status)}`}>
                            {statusLabel(w.status)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {withdraws.length > 0 ? (
              <div className="mt-3 text-[11px] text-white/50">
                * O pagamento do saque é feito via PIX e o status é atualizado pelo administrador.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
