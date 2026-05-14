"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { trackPurchase } from "@/lib/ga";

type TokenOrder = {
  id: string;
  tokens: number;
  total_cents: number;
  status: string;
  created_at: string;
  mp_status: string | null;
  mp_qr_base64: string | null;
  mp_pix_copy_paste: string | null;
};

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function isPending(o: TokenOrder) {
  const s = (o.mp_status ?? o.status ?? "").toLowerCase();
  return s === "pending" || s === "in_process";
}

function translateStatus(status?: string | null) {
  switch ((status ?? "").toLowerCase()) {
    case "approved":
    case "paid":
      return "Pago";
    case "pending":
    case "in_process":
      return "Pendente";
    case "cancelled":
    case "rejected":
    case "expired":
      return "Cancelado";
    default:
      return status ?? "-";
  }
}

function statusBadge(status?: string | null) {
  switch ((status ?? "").toLowerCase()) {
    case "approved":
    case "paid":
      return "pl-badge pl-badge-ok";
    case "pending":
    case "in_process":
      return "pl-badge pl-badge-warn";
    case "cancelled":
    case "rejected":
    case "expired":
      return "pl-badge pl-badge-danger";
    default:
      return "pl-badge";
  }
}

function minutesSince(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diff / 60000));
}

export default function BillingPage() {
  const supabase = useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const search = useSearchParams();
  const router = useRouter();

  const AUTO_OPEN_MINUTES = 2;
  const PENDING_EXPIRE_UI_MINUTES = 30;
  const FORCE_OPEN = search.get("pay") === "1";

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<TokenOrder[]>([]);
  const [pending, setPending] = useState<TokenOrder | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);

  async function load() {
    setLoading(true);
    setErr(null);

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user || userErr) {
      setErr("Voce precisa estar logado.");
      setOrders([]);
      setPending(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("token_orders")
      .select("id,tokens,total_cents,status,created_at,mp_status,mp_qr_base64,mp_pix_copy_paste")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      setErr(error.message);
      setOrders([]);
      setPending(null);
      setLoading(false);
      return;
    }

    const list = (data as TokenOrder[]) ?? [];
    setOrders(list);

    const p = list.find((o) => isPending(o)) ?? null;
    setPending(p);

    if (p) {
      const mins = minutesSince(p.created_at);
      if (FORCE_OPEN || mins <= AUTO_OPEN_MINUTES) setPayOpen(true);
    } else {
      setPayOpen(false);
    }

    setLoading(false);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await load();
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => load(), 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending?.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPayOpen(false);
    }
    if (payOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [payOpen]);

  useEffect(() => {
    if (!orders || orders.length === 0) return;

    const paidOrder = orders.find((o) => {
      const status = String(o.mp_status ?? o.status ?? "").toLowerCase();
      return status === "approved" || status === "paid";
    });

    if (!paidOrder) return;

    const key = `purchase_tracked_${paidOrder.id}`;
    if (typeof window !== "undefined" && localStorage.getItem(key)) return;

    trackPurchase({
      transaction_id: paidOrder.id,
      value: paidOrder.total_cents / 100,
      currency: "BRL",
      items: [
        {
          item_id: paidOrder.id,
          item_name: `${paidOrder.tokens} Tokens`,
          price: paidOrder.total_cents / 100,
          quantity: 1,
        },
      ],
    });

    if (typeof window !== "undefined") {
      localStorage.setItem(key, "1");
    }
  }, [orders]);

  function closePay() {
    setPayOpen(false);
    if (FORCE_OPEN) router.replace("/billing");
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    alert("Codigo PIX copiado!");
  }

  const pendingMinutes = pending ? minutesSince(pending.created_at) : 0;
  const showQrAllowed = !!pending && pendingMinutes <= PENDING_EXPIRE_UI_MINUTES;
  const paidCount = orders.filter((order) => ["approved", "paid"].includes(String(order.mp_status ?? order.status).toLowerCase())).length;
  const totalPaidCents = orders.reduce((sum, order) => {
    const status = String(order.mp_status ?? order.status).toLowerCase();
    return ["approved", "paid"].includes(status) ? sum + order.total_cents : sum;
  }, 0);

  return (
    <main className="pl-page max-w-7xl space-y-6">
      <div className="pl-page-title">
        <div>
          <span className="pl-badge">Historico financeiro</span>
          <h1>Minhas Compras</h1>
          <p>Acompanhe seus pagamentos de tokens, PIX pendentes e compras aprovadas.</p>
        </div>

        <Link href="/tokens" className="pl-btn pl-btn-primary">
          Comprar Tokens
        </Link>
      </div>

      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {err}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="pl-card-soft">
          <div className="text-sm font-bold text-slate-500">Compras aprovadas</div>
          <div className="mt-2 text-3xl font-black text-slate-950">{paidCount}</div>
        </div>
        <div className="pl-card-soft">
          <div className="text-sm font-bold text-slate-500">Total pago</div>
          <div className="mt-2 text-3xl font-black text-slate-950">{money(totalPaidCents)}</div>
        </div>
        <div className="pl-card-soft">
          <div className="text-sm font-bold text-slate-500">Pagamento pendente</div>
          <div className="mt-2 text-3xl font-black text-slate-950">{pending ? "1" : "0"}</div>
        </div>
      </section>

      {!loading && pending ? (
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-black text-amber-900">Voce tem um PIX pendente</div>
              <p className="mt-1 text-sm font-semibold text-amber-700">
                Pedido de {pending.tokens} tokens no valor de {money(pending.total_cents)}.
              </p>
            </div>
            <button type="button" onClick={() => setPayOpen(true)} className="pl-btn pl-btn-primary justify-center">
              Pagar agora
            </button>
          </div>
        </div>
      ) : null}

      {payOpen && pending ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={closePay} />

          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-3xl -translate-x-1/2 -translate-y-1/2">
            <div className="overflow-hidden rounded-[32px] border border-white/60 bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
                <div>
                  <span className="pl-badge pl-badge-warn">PIX pendente</span>
                  <h2 className="mt-3 text-2xl font-black text-slate-950">Pagamento via PIX</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {pending.tokens} tokens - {money(pending.total_cents)} - ha {pendingMinutes} min
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">Pedido: {pending.id}</p>
                </div>

                <button type="button" onClick={closePay} className="pl-btn">
                  Fechar
                </button>
              </div>

              <div className="p-6">
                {!showQrAllowed ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                    Esse PIX ja esta antigo. Volte em <b>Comprar Tokens</b> e gere um novo.
                  </div>
                ) : (
                  <div className="grid gap-5 md:grid-cols-[.85fr_1.15fr]">
                    <div className="pl-card-soft">
                      <div className="text-sm font-black text-slate-950">QR Code</div>
                      {pending.mp_qr_base64 ? (
                        <img
                          alt="QR Code PIX"
                          className="mt-4 w-full rounded-[24px] border border-slate-200 bg-white p-3"
                          src={`data:image/png;base64,${pending.mp_qr_base64}`}
                        />
                      ) : (
                        <div className="mt-4 text-sm font-semibold text-slate-500">Aguardando QR Code...</div>
                      )}
                    </div>

                    <div className="pl-card-soft">
                      <div className="text-sm font-black text-slate-950">PIX copia e cola</div>
                      {pending.mp_pix_copy_paste ? (
                        <>
                          <div className="mt-4 max-h-48 overflow-auto break-all rounded-[20px] border border-slate-200 bg-white p-4 text-xs font-semibold text-slate-600">
                            {pending.mp_pix_copy_paste}
                          </div>

                          <button
                            type="button"
                            onClick={() => copy(pending.mp_pix_copy_paste!)}
                            className="pl-btn pl-btn-primary mt-4 w-full justify-center"
                          >
                            Copiar codigo PIX
                          </button>

                          <p className="mt-3 text-xs font-semibold text-slate-500">
                            Assim que o pagamento for aprovado, o painel atualiza automaticamente.
                          </p>
                        </>
                      ) : (
                        <div className="mt-4 text-sm font-semibold text-slate-500">Aguardando codigo PIX...</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <section className="pl-card">
        <div className="pl-card-head">
          <div>
            <h2>Historico de compras</h2>
            <p>Ultimas 50 compras registradas na sua conta.</p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="pl-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tokens</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4}>Carregando...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={4}>Nenhuma compra encontrada.</td>
                </tr>
              ) : (
                orders.map((order) => {
                  const status = order.mp_status ?? order.status;
                  return (
                    <tr key={order.id}>
                      <td>{new Date(order.created_at).toLocaleString("pt-BR")}</td>
                      <td>{order.tokens}</td>
                      <td>{money(order.total_cents)}</td>
                      <td>
                        <span className={statusBadge(status)}>{translateStatus(status)}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
