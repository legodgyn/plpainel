"use client";

import { useEffect, useMemo, useState } from "react";

type OrderRow = {
  id: string;
  user_id: string;
  total_cents: number;
  status: string;
  created_at: string;
  mp_payment_id: string | null;
};

function money(cents: number) {
  return (Number(cents || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

function statusLabelPt(status: string) {
  const s = String(status || "").toLowerCase();
  if (s === "paid") return "Pago";
  if (s === "pending") return "Pendente";
  if (s === "failed") return "Falhou";
  if (s === "canceled" || s === "cancelled") return "Cancelado";
  if (s === "refunded") return "Reembolsado";
  return status;
}

function statusBadge(status: string) {
  const s = String(status || "").toLowerCase();
  if (s === "paid") return "bg-emerald-500/15 text-emerald-200 border-emerald-500/20";
  if (s === "pending") return "bg-amber-500/15 text-amber-200 border-amber-500/20";
  if (s === "failed") return "bg-red-500/15 text-red-200 border-red-500/20";
  return "bg-white/10 text-white/70 border-white/10";
}

export default function AdminOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [totalReceivedCents, setTotalReceivedCents] = useState(0);

  async function load() {
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders", { cache: "no-store" });
      const json = await res.json();

      if (!res.ok) {
        setMsg(json?.error || "Erro ao carregar.");
        setOrders([]);
        setTotalReceivedCents(0);
        return;
      }

      const rows: OrderRow[] = json.orders || [];
      setOrders(rows);

      const totalPaid = rows.reduce((acc, o) => {
        const s = String(o.status || "").toLowerCase();
        if (s === "paid") return acc + Number(o.total_cents || 0);
        return acc;
      }, 0);

      setTotalReceivedCents(totalPaid);
    } catch (e: any) {
      setMsg(e?.message || "Erro inesperado.");
      setOrders([]);
      setTotalReceivedCents(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6 text-white">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Compras</h1>
            <p className="mt-1 text-sm text-white/60">Visualize todas as compras realizadas na plataforma.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
              <div className="text-white/70">Total recebido</div>
              <div className="text-lg font-bold">{money(totalReceivedCents)}</div>
            </div>

            <button
              onClick={load}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
            >
              Atualizar
            </button>
          </div>
        </div>
      </div>

      {msg ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {msg}
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-white/70">
              <tr className="border-b border-white/10">
                <th className="py-3 text-left font-medium">Data</th>
                <th className="py-3 text-left font-medium">Usuário</th>
                <th className="py-3 text-left font-medium">Total</th>
                <th className="py-3 text-left font-medium">Status</th>
                <th className="py-3 text-left font-medium">MP</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td className="py-4 text-white/60" colSpan={5}>
                    Carregando...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td className="py-4 text-white/60" colSpan={5}>
                    Nenhuma compra encontrada.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-white/5">
                    <td className="py-3 text-white/70">{fmt(o.created_at)}</td>
                    <td className="py-3">
                      <div className="font-semibold text-white/90">{o.user_id}</div>
                      <div className="text-xs text-white/50">{o.id}</div>
                    </td>
                    <td className="py-3">{money(Number(o.total_cents || 0))}</td>
                    <td className="py-3">
                      <span className={`rounded-full border px-3 py-1 text-xs ${statusBadge(o.status)}`}>
                        {statusLabelPt(o.status)}
                      </span>
                    </td>
                    <td className="py-3 text-white/70">{o.mp_payment_id || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-[11px] text-white/50">
          * Esta tela é restrita para admins definidos em <b>NEXT_PUBLIC_ADMIN_MASTER_EMAILS</b>.
        </div>
      </div>
    </div>
  );
}
