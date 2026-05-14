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
  if (s === "paid") return "Pago";
  if (s === "approved") return "Aprovado";
  if (s === "pending") return "Pendente";
  if (s === "canceled") return "Cancelado";
  if (s === "requested") return "Solicitado";
  if (s === "rejected") return "Rejeitado";
  return status || "-";
}

function statusBadge(status: string) {
  const s = normalizeStatus(status);
  if (s === "paid" || s === "approved") return "pl-badge pl-badge-ok";
  if (s === "pending" || s === "requested") return "pl-badge pl-badge-warn";
  if (s === "canceled" || s === "rejected") return "pl-badge pl-badge-danger";
  return "pl-badge";
}

export default function AffiliatePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [withdraws, setWithdraws] = useState<Withdraw[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [pixKey, setPixKey] = useState("");
  const [pixType, setPixType] = useState<Withdraw["pix_key_type"]>("random");
  const [amountBRL, setAmountBRL] = useState("");
  const [reqLoading, setReqLoading] = useState(false);

  const appBase = useMemo(() => {
    const envUrl = (process.env.NEXT_PUBLIC_APP_URL || "").trim();
    return envUrl || "https://plpainel.com";
  }, []);

  const totals = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let paid = 0;

    for (const commission of commissions) {
      const value = Number(commission.amount_cents || 0);
      const status = normalizeStatus(commission.status);
      if (status === "pending") pending += value;
      if (status === "approved") approved += value;
      if (status === "paid") paid += value;
    }

    let withdrawPaid = 0;
    let withdrawRequested = 0;
    for (const withdraw of withdraws) {
      const value = Number(withdraw.amount_cents || 0);
      const status = normalizeStatus(withdraw.status);
      if (status === "paid") withdrawPaid += value;
      if (status === "requested" || status === "approved") withdrawRequested += value;
    }

    const available = Math.max(0, approved - withdrawPaid - withdrawRequested);
    return { pending, approved, paid, withdrawPaid, withdrawRequested, available };
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

    const commRes = await supabase
      .from("affiliate_commissions")
      .select("id,amount_cents,status,created_at,referred_user_id,order_id")
      .eq("affiliate_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);

    const wdRes = await supabase
      .from("affiliate_withdraw_requests")
      .select("id,amount_cents,pix_key,pix_key_type,status,created_at,updated_at")
      .eq("affiliate_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (commRes.error) setMsg((prev) => prev ?? commRes.error!.message);
    if (wdRes.error) setMsg((prev) => prev ?? wdRes.error!.message);

    setCommissions((commRes.data as Commission[]) ?? []);
    setWithdraws((wdRes.data as Withdraw[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    alert("Copiado!");
  }

  async function requestWithdraw() {
    setMsg(null);

    if (!affiliate?.is_active) return setMsg("Seu afiliado esta desativado. Fale com o suporte.");
    if (!pixKey.trim()) return setMsg("Informe sua chave PIX.");

    const amount = Number(String(amountBRL).replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) return setMsg("Informe um valor valido.");

    const cents = Math.round(amount * 100);
    const minCents = 5000;
    if (cents < minCents) return setMsg(`Saque minimo: ${money(minCents)}.`);
    if (cents > totals.available) return setMsg(`Saldo disponivel insuficiente. Disponivel: ${money(totals.available)}.`);

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
        pix_key: pixKey.trim(),
        pix_key_type: pixType,
        status: "requested",
      });

      if (error) {
        setMsg(error.message);
        return;
      }

      setPixKey("");
      setAmountBRL("");
      setPixType("random");
      await load();
      alert("Pedido de saque enviado! Vamos analisar e pagar via PIX.");
    } finally {
      setReqLoading(false);
    }
  }

  const refLink = affiliate?.code ? `${appBase}/login?ref=${encodeURIComponent(affiliate.code)}` : "";

  return (
    <main className="pl-page max-w-7xl space-y-6">
      <div className="pl-page-title">
        <div>
          <span className="pl-badge">Programa de indicacao</span>
          <h1>Afiliados</h1>
          <p>Acompanhe suas comissoes, copie seu link e solicite saque via PIX.</p>
        </div>
        <button type="button" onClick={load} className="pl-btn">
          Atualizar
        </button>
      </div>

      {msg ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {msg}
        </div>
      ) : null}

      {!loading && !affiliate ? (
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5">
          <div className="font-black text-amber-900">Voce ainda nao e afiliado</div>
          <p className="mt-1 text-sm font-semibold text-amber-700">
            Entre em contato pelo numero (62)99999-4162 para ativar seu afiliado e gerar seu codigo.
          </p>
        </div>
      ) : null}

      {affiliate ? (
        <>
          <section className="pl-card">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <span className={affiliate.is_active ? "pl-badge pl-badge-ok" : "pl-badge pl-badge-danger"}>
                  {affiliate.is_active ? "Ativo" : "Desativado"}
                </span>
                <h2 className="mt-3 text-2xl font-black text-slate-950">Codigo {affiliate.code}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Comissao padrao: {(Number(affiliate.commission_rate) * 100).toFixed(0)}%
                </p>
                <div className="mt-4 max-w-3xl rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                  {refLink}
                </div>
              </div>
              <button type="button" onClick={() => copy(refLink)} className="pl-btn pl-btn-primary">
                Copiar link
              </button>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-4">
            <div className="pl-card-soft">
              <div className="text-sm font-bold text-slate-500">Disponivel</div>
              <div className="mt-2 text-3xl font-black text-slate-950">{money(totals.available)}</div>
            </div>
            <div className="pl-card-soft">
              <div className="text-sm font-bold text-slate-500">Pendente</div>
              <div className="mt-2 text-3xl font-black text-slate-950">{money(totals.pending)}</div>
            </div>
            <div className="pl-card-soft">
              <div className="text-sm font-bold text-slate-500">Aprovado</div>
              <div className="mt-2 text-3xl font-black text-slate-950">{money(totals.approved)}</div>
            </div>
            <div className="pl-card-soft">
              <div className="text-sm font-bold text-slate-500">Pago</div>
              <div className="mt-2 text-3xl font-black text-slate-950">{money(totals.paid)}</div>
            </div>
          </section>

          <section className="pl-card">
            <div className="pl-card-head">
              <div>
                <h2>Solicitar saque PIX</h2>
                <p>Saque minimo de R$ 50,00. Disponivel agora: {money(totals.available)}.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div>
                <label className="pl-label">Tipo de chave</label>
                <select value={pixType} onChange={(event) => setPixType(event.target.value)} className="pl-select mt-2">
                  <option value="random">Aleatoria</option>
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                  <option value="email">E-mail</option>
                  <option value="phone">Telefone</option>
                </select>
              </div>
              <div>
                <label className="pl-label">Chave PIX</label>
                <input value={pixKey} onChange={(event) => setPixKey(event.target.value)} placeholder="Digite sua chave PIX" className="pl-input mt-2" />
              </div>
              <div>
                <label className="pl-label">Valor</label>
                <input value={amountBRL} onChange={(event) => setAmountBRL(event.target.value)} placeholder="50.00" className="pl-input mt-2" />
              </div>
            </div>

            <button type="button" onClick={requestWithdraw} disabled={reqLoading || !affiliate.is_active} className="pl-btn pl-btn-primary mt-5">
              {reqLoading ? "Enviando..." : "Solicitar saque"}
            </button>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="pl-card">
              <div className="pl-card-head">
                <div>
                  <h2>Comissoes</h2>
                  <p>Historico das comissoes geradas.</p>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="pl-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Valor</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.length === 0 ? (
                      <tr>
                        <td colSpan={3}>Nenhuma comissao ainda.</td>
                      </tr>
                    ) : (
                      commissions.map((commission) => (
                        <tr key={commission.id}>
                          <td>{fmt(commission.created_at)}</td>
                          <td>{money(Number(commission.amount_cents || 0))}</td>
                          <td><span className={statusBadge(commission.status)}>{statusLabel(commission.status)}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pl-card">
              <div className="pl-card-head">
                <div>
                  <h2>Saques</h2>
                  <p>Solicitacoes enviadas para pagamento.</p>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="pl-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Valor</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdraws.length === 0 ? (
                      <tr>
                        <td colSpan={3}>Nenhum saque solicitado ainda.</td>
                      </tr>
                    ) : (
                      withdraws.map((withdraw) => (
                        <tr key={withdraw.id}>
                          <td>{fmt(withdraw.created_at)}</td>
                          <td>{money(Number(withdraw.amount_cents || 0))}</td>
                          <td><span className={statusBadge(withdraw.status)}>{statusLabel(withdraw.status)}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
