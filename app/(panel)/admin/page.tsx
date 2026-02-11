"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

type Row = {
  id: string;
  created_at: string;
  email: string | null;
  total_label: string;
  status: string;
  status_label: string;
  affiliate_code: string | null;
};

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

function badge(status: string) {
  const s = String(status || "").toLowerCase();
  if (s === "paid") return "bg-emerald-500/15 text-emerald-200 border-emerald-500/20";
  if (s === "pending") return "bg-amber-500/15 text-amber-200 border-amber-500/20";
  if (s === "failed" || s === "canceled" || s === "cancelled")
    return "bg-red-500/15 text-red-200 border-red-500/20";
  return "bg-white/10 text-white/70 border-white/10";
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState("—");
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setMsg(null);
    setLoading(true);

    const { data: auth } = await supabase.auth.getSession();
    const token = auth?.session?.access_token;

    if (!token) {
      setMsg("Você precisa estar logado.");
      setLoading(false);
      return;
    }

    const r = await fetch("/api/admin/orders", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.ok) {
      setMsg(j?.error || "Erro ao carregar compras.");
      setLoading(false);
      return;
    }

    setTotal(j.total_received_label || "—");
    setRows(j.orders || []);
    setLoading(false);
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
            <p className="mt-1 text-sm text-white/60">
              Visualize todas as compras realizadas na plataforma.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
              <div className="text-white/60">Total recebido</div>
              <div className="text-lg font-bold">{total}</div>
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
                <th className="py-3 text-left font-medium">E-mail</th>
                <th className="py-3 text-left font-medium">Total</th>
                <th className="py-3 text-left font-medium">Status</th>
                <th className="py-3 text-left font-medium">Afiliado</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-6 text-white/60">
                    Carregando...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-white/60">
                    Nenhuma compra encontrada.
                  </td>
                </tr>
              ) : (
                rows.map((o) => (
                  <tr key={o.id} className="hover:bg-white/5">
                    <td className="py-3 text-white/70">{fmt(o.created_at)}</td>
                    <td className="py-3">
                      <div className="font-semibold text-white/90">{o.email || "—"}</div>
                      <div className="text-[11px] text-white/40">{o.id}</div>
                    </td>
                    <td className="py-3">{o.total_label}</td>
                    <td className="py-3">
                      <span className={`rounded-full border px-3 py-1 text-xs ${badge(o.status)}`}>
                        {o.status_label}
                      </span>
                    </td>
                    <td className="py-3">
                      {o.affiliate_code ? (
                        <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs text-violet-200">
                          {o.affiliate_code}
                        </span>
                      ) : (
                        <span className="text-white/50">—</span>
                      )}
                    </td>
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