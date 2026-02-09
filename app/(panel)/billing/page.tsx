"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useSearchParams, useRouter } from "next/navigation";

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
      return status ?? "—";
  }
}

function statusColor(status?: string | null) {
  switch ((status ?? "").toLowerCase()) {
    case "approved":
    case "paid":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-400/30";
    case "pending":
    case "in_process":
      return "bg-amber-500/20 text-amber-300 border-amber-400/30";
    case "cancelled":
    case "rejected":
    case "expired":
      return "bg-red-500/20 text-red-300 border-red-400/30";
    default:
      return "bg-white/10 text-white/70 border-white/10";
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

  // ✅ flags de UX
  const AUTO_OPEN_MINUTES = 2; // se pendente criado nos últimos X minutos, abre modal
  const PENDING_EXPIRE_UI_MINUTES = 30; // depois disso, não exibe QR no modal (manda gerar novo)
  const FORCE_OPEN = search.get("pay") === "1"; // /billing?pay=1

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<TokenOrder[]>([]);
  const [pending, setPending] = useState<TokenOrder | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // ✅ Modal
  const [payOpen, setPayOpen] = useState(false);

  async function load() {
    setLoading(true);
    setErr(null);

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user || userErr) {
      setErr("Você precisa estar logado.");
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

    // ✅ auto-open premium
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

  // ✅ Enquanto existir pendente, faz polling para sumir quando pagar
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => load(), 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending?.id]);

  // ✅ ESC fecha modal
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPayOpen(false);
    }
    if (payOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [payOpen]);

  // ✅ se abriu via ?pay=1, ao fechar a gente limpa a query (fica mais clean)
  function closePay() {
    setPayOpen(false);
    if (FORCE_OPEN) router.replace("/billing");
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    alert("Código PIX copiado!");
  }

  const pendingMinutes = pending ? minutesSince(pending.created_at) : 0;
  const showQrAllowed = !!pending && pendingMinutes <= PENDING_EXPIRE_UI_MINUTES;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Minhas Compras</h1>
            <p className="mt-1 text-sm text-white/60">
              Aqui você acompanha suas compras de tokens.
            </p>
          </div>

          {/* ✅ só um banner + botão (sem QR na tela) */}
          {!loading && pending ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-200">
                Você tem um pagamento pendente
              </span>
              <button
                onClick={() => setPayOpen(true)}
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
              >
                Pagar agora
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {err ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      {/* MODAL PAGAMENTO */}
      {payOpen && pending ? (
        <div className="fixed inset-0 z-50">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closePay}
          />

          {/* modal */}
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-2xl -translate-x-1/2 -translate-y-1/2">
            <div className="rounded-3xl border border-white/10 bg-[#0b1220]/95 shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
                <div>
                  <div className="text-lg font-semibold text-white">
                    Pagamento via PIX
                  </div>
                  <div className="mt-1 text-sm text-white/70">
                    {pending.tokens} tokens • {money(pending.total_cents)} • há{" "}
                    {pendingMinutes} min
                  </div>
                  <div className="mt-1 text-xs text-white/55">
                    Pedido: {pending.id}
                  </div>
                </div>

                <button
                  onClick={closePay}
                  className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
                >
                  Fechar
                </button>
              </div>

              <div className="p-5">
                {!showQrAllowed ? (
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-200">
                    Esse PIX já está antigo. Volte em <b>Comprar Tokens</b> e gere um novo.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-xs font-semibold text-white/70">
                        QR Code
                      </div>

                      {pending.mp_qr_base64 ? (
                        <img
                          alt="QR Code PIX"
                          className="mt-3 w-full rounded-2xl border border-white/10 bg-white p-3"
                          src={`data:image/png;base64,${pending.mp_qr_base64}`}
                        />
                      ) : (
                        <div className="mt-3 text-sm text-white/70">
                          Aguardando QR Code…
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-xs font-semibold text-white/70">
                        PIX Copia e Cola
                      </div>

                      {pending.mp_pix_copy_paste ? (
                        <>
                          <div className="mt-3 max-h-40 overflow-auto break-all rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white/80">
                            {pending.mp_pix_copy_paste}
                          </div>

                          <button
                            onClick={() => copy(pending.mp_pix_copy_paste!)}
                            className="mt-3 w-full rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
                          >
                            Copiar código PIX
                          </button>

                          <div className="mt-3 text-xs text-white/50">
                            Assim que o pagamento for aprovado, essa janela fecha sozinha.
                          </div>
                        </>
                      ) : (
                        <div className="mt-3 text-sm text-white/70">
                          Aguardando código PIX…
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-2 text-center text-xs text-white/40">
              Dica: pressione <b>ESC</b> para fechar.
            </div>
          </div>
        </div>
      ) : null}

      {/* HISTÓRICO */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="text-base font-semibold text-white">Histórico de Compras</div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm text-white">
            <thead className="text-white/70">
              <tr className="border-b border-white/10">
                <th className="py-3 text-left">Data</th>
                <th className="py-3 text-left">Tokens</th>
                <th className="py-3 text-left">Total</th>
                <th className="py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-4 text-white/60">
                    Carregando…
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-white/60">
                    Nenhuma compra encontrada.
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const st = o.mp_status ?? o.status;
                  return (
                    <tr key={o.id} className="border-b border-white/5">
                      <td className="py-3 text-white/70">
                        {new Date(o.created_at).toLocaleString("pt-BR")}
                      </td>
                      <td className="py-3">{o.tokens}</td>
                      <td className="py-3">{money(o.total_cents)}</td>
                      <td className="py-3">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${statusColor(st)}`}
                        >
                          {translateStatus(st)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
