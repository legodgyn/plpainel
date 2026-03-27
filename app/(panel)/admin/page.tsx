"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

type Row = {
  id: string;
  created_at: string;
  email: string | null;
  whatsapp: string | null;
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
  if (s === "failed" || s === "canceled" || s === "cancelled") {
    return "bg-red-500/15 text-red-200 border-red-500/20";
  }
  return "bg-white/10 text-white/70 border-white/10";
}

function toDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseMoneyLabelBRL(value: string) {
  if (!value) return 0;

  const cleaned = String(value)
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState("—");
  const [msg, setMsg] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [affiliateFilter, setAffiliateFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("newest");

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

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setAffiliateFilter("all");
    setDateFrom("");
    setDateTo("");
    setSortBy("newest");
  }

  function setLast7Days() {
    const now = new Date();
    const from = new Date();
    from.setDate(now.getDate() - 7);

    setDateFrom(toDateInputValue(from));
    setDateTo(toDateInputValue(now));
  }

  function setThisMonth() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

    setDateFrom(toDateInputValue(firstDay));
    setDateTo(toDateInputValue(now));
  }

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    const parsedFrom = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const parsedTo = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

    const result = rows.filter((o) => {
      const createdAt = new Date(o.created_at);
      const status = String(o.status || "").toLowerCase();
      const hasAffiliate = !!o.affiliate_code;

      if (statusFilter !== "all" && status !== statusFilter) return false;

      if (affiliateFilter === "with_affiliate" && !hasAffiliate) return false;
      if (affiliateFilter === "without_affiliate" && hasAffiliate) return false;

      if (parsedFrom && createdAt < parsedFrom) return false;
      if (parsedTo && createdAt > parsedTo) return false;

      if (term) {
        const haystack = [
          o.id,
          o.email || "",
          o.whatsapp || "",
          o.affiliate_code || "",
          o.status_label || "",
          o.status || "",
          o.total_label || "",
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(term)) return false;
      }

      return true;
    });

    result.sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();

      if (sortBy === "oldest") return ta - tb;
      return tb - ta;
    });

    return result;
  }, [rows, search, statusFilter, affiliateFilter, dateFrom, dateTo, sortBy]);

  const stats = useMemo(() => {
    let paidCount = 0;
    let pendingCount = 0;
    let canceledCount = 0;
    let paidAmount = 0;

    for (const row of filteredRows) {
      const status = String(row.status || "").toLowerCase();
      const amount = parseMoneyLabelBRL(row.total_label);

      if (status === "paid") {
        paidCount++;
        paidAmount += amount;
      } else if (status === "pending") {
        pendingCount++;
      } else if (status === "failed" || status === "canceled" || status === "cancelled") {
        canceledCount++;
      }
    }

    return {
      totalRows: filteredRows.length,
      paidCount,
      pendingCount,
      canceledCount,
      paidAmountLabel: formatBRL(paidAmount),
    };
  }, [filteredRows]);

  return (
    <div className="space-y-6 text-white">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Compras</h1>
            <p className="mt-1 text-sm text-white/60">
              Visualize todas as compras realizadas na plataforma.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
              <div className="text-white/60">Total geral recebido</div>
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
        <div className="grid gap-3 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-white/60">
              Buscar
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="E-mail, WhatsApp, ID, afiliado..."
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white outline-none focus:border-violet-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-white/60">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white outline-none focus:border-violet-400"
            >
              <option value="all">Todos</option>
              <option value="paid">Pago</option>
              <option value="pending">Pendente</option>
              <option value="failed">Falhou</option>
              <option value="canceled">Cancelado</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-white/60">
              Afiliado
            </label>
            <select
              value={affiliateFilter}
              onChange={(e) => setAffiliateFilter(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white outline-none focus:border-violet-400"
            >
              <option value="all">Todos</option>
              <option value="with_affiliate">Com afiliado</option>
              <option value="without_affiliate">Sem afiliado</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-white/60">
              Data inicial
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white outline-none focus:border-violet-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-white/60">
              Data final
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white outline-none focus:border-violet-400"
            />
          </div>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-white/60">
              Ordenar
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white outline-none focus:border-violet-400"
            >
              <option value="newest">Mais recentes</option>
              <option value="oldest">Mais antigas</option>
            </select>
          </div>

          <div className="lg:col-span-5 flex flex-wrap items-end gap-2">
            <button
              onClick={setLast7Days}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
            >
              Últimos 7 dias
            </button>

            <button
              onClick={setThisMonth}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
            >
              Este mês
            </button>

            <button
              onClick={clearFilters}
              className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/15"
            >
              Limpar filtros
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs text-white/50">Pedidos filtrados</div>
          <div className="mt-2 text-2xl font-bold">{loading ? "—" : stats.totalRows}</div>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <div className="text-xs text-emerald-200/70">Pagos</div>
          <div className="mt-2 text-2xl font-bold text-emerald-200">
            {loading ? "—" : stats.paidCount}
          </div>
          <div className="mt-1 text-sm text-emerald-100/80">
            {loading ? "—" : stats.paidAmountLabel}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
          <div className="text-xs text-amber-200/70">Pendentes</div>
          <div className="mt-2 text-2xl font-bold text-amber-200">
            {loading ? "—" : stats.pendingCount}
          </div>
        </div>

        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
          <div className="text-xs text-red-200/70">Cancelados / falhos</div>
          <div className="mt-2 text-2xl font-bold text-red-200">
            {loading ? "—" : stats.canceledCount}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-white/70">
              <tr className="border-b border-white/10">
                <th className="py-3 text-left font-medium">Data</th>
                <th className="py-3 text-left font-medium">E-mail</th>
                <th className="py-3 text-left font-medium">WhatsApp</th>
                <th className="py-3 text-left font-medium">Total</th>
                <th className="py-3 text-left font-medium">Status</th>
                <th className="py-3 text-left font-medium">Afiliado</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-6 text-white/60">
                    Carregando...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-white/60">
                    Nenhuma compra encontrada com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredRows.map((o) => (
                  <tr key={o.id} className="hover:bg-white/5">
                    <td className="py-3 text-white/70">{fmt(o.created_at)}</td>

                    <td className="py-3">
                      <div className="font-semibold text-white/90">{o.email || "—"}</div>
                      <div className="text-[11px] text-white/40">{o.id}</div>
                    </td>

                    <td className="py-3">
                      {o.whatsapp ? (
                        <a
                          href={`https://wa.me/${String(o.whatsapp).replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-emerald-300 hover:text-emerald-200"
                        >
                          {o.whatsapp}
                        </a>
                      ) : (
                        <span className="text-white/50">—</span>
                      )}
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
