"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type TokenOrder = {
  id: string;
  tokens: number;
  total_cents: number;
  status: string;
  created_at: string;
  mp_status: string | null;
  mp_qr_base64: string | null;
  mp_pix_copy_paste: string | null;
  mp_payment_id: string | null;
};

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function BillingPage() {
  const supabase = useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<TokenOrder[]>([]);
  const [pending, setPending] = useState<TokenOrder | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErr(null);

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!user || userErr) {
        if (!alive) return;
        setErr("Você precisa estar logado.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("token_orders")
        .select("id,tokens,total_cents,status,created_at,mp_status,mp_qr_base64,mp_pix_copy_paste,mp_payment_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!alive) return;

      if (error) {
        setErr(error.message);
        setOrders([]);
        setPending(null);
      } else {
        const list = (data as TokenOrder[]) ?? [];
        setOrders(list);

        const p = list.find((o) => o.status === "pending" || o.mp_status === "pending" || o.mp_status === "in_process") ?? null;
        setPending(p);
      }

      setLoading(false);
    }

    load();
    return () => {
      alive = false;
    };
  }, [supabase]);

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    alert("Código PIX copiado!");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h1 className="text-xl font-semibold text-white">Minhas Compras</h1>
        <p className="mt-1 text-sm text-white/60">
          Aqui você acompanha compras pagas e pendentes.
        </p>
      </div>

      {err ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      {/* PENDENTE */}
      {loading ? null : pending ? (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-sm font-semibold text-amber-200">Compra pendente</div>
              <div className="mt-1 text-white/80">
                {pending.tokens} tokens • {money(pending.total_cents)}
              </div>
              <div className="mt-1 text-xs text-white/60">
                Pedido: {pending.id}
              </div>
            </div>

            <div className="grid gap-3 md:max-w-md">
              {pending.mp_qr_base64 ? (
                <img
                  alt="QR Code PIX"
                  className="w-56 rounded-xl border border-white/10 bg-white p-3"
                  src={`data:image/png;base64,${pending.mp_qr_base64}`}
                />
              ) : null}

              {pending.mp_pix_copy_paste ? (
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs font-semibold text-white/70">PIX Copia e Cola</div>
                  <div className="mt-2 break-all text-xs text-white/80">
                    {pending.mp_pix_copy_paste}
                  </div>
                  <button
                    onClick={() => copy(pending.mp_pix_copy_paste!)}
                    className="mt-3 w-full rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
                  >
                    Copiar código PIX
                  </button>
                </div>
              ) : (
                <div className="text-sm text-white/70">
                  Aguardando dados do PIX…
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* HISTÓRICO */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold text-white">Histórico de Compras</div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm text-white">
            <thead className="text-white/70">
              <tr className="border-b border-white/10">
                <th className="py-3 text-left font-medium">Data</th>
                <th className="py-3 text-left font-medium">Tokens</th>
                <th className="py-3 text-left font-medium">Total</th>
                <th className="py-3 text-left font-medium">Status</th>
                <th className="py-3 text-left font-medium">MP</th>
              </tr>
            </thead>
            <tbody className="text-white/90">
              {loading ? (
                <tr>
                  <td className="py-4 text-white/60" colSpan={5}>Carregando…</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td className="py-4 text-white/60" colSpan={5}>Nenhuma compra ainda.</td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="border-b border-white/5">
                    <td className="py-3 text-white/70">{new Date(o.created_at).toLocaleString()}</td>
                    <td className="py-3">{o.tokens}</td>
                    <td className="py-3">{money(o.total_cents)}</td>
                    <td className="py-3">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs">
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3 text-white/70">{o.mp_status ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
