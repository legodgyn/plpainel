"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

type Row = {
  id: string;
  created_at: string;
  email: string | null;
  whatsapp: string | null;
  total_label: string;
  customer_total_label?: string | null;
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

function badgeClass(status: string) {
  const s = String(status || "").toLowerCase();
  if (s === "paid") return "pl-badge pl-badge-ok";
  if (s === "pending") return "pl-badge pl-badge-warn";
  if (s === "failed" || s === "canceled" || s === "cancelled") {
    return "pl-badge pl-badge-danger";
  }
  return "pl-badge";
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
  const [total, setTotal] = useState("-");
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

    setTotal(j.total_received_label || "-");
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
          o.customer_total_label || "",
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
    <div className="pl-page space-y-6">
      <div className="pl-page-title">
        <div>
          <h1>Compras na Plataforma</h1>
          <p>Visualize compras realizadas, status de pagamento, afiliados e receita filtrada.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="pl-badge">
            Total recebido: <strong>{total}</strong>
          </div>
          <button onClick={load} className="pl-btn pl-btn-primary">
            Atualizar
          </button>
        </div>
      </div>

      {msg ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {msg}
        </div>
      ) : null}

      <div className="pl-card p-5">
        <div className="grid gap-3 lg:grid-cols-[1.5fr_.8fr_.9fr_.8fr_.8fr_.8fr]">
          <label>
            <span className="pl-label">Buscar</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="E-mail, WhatsApp, ID, afiliado..."
              className="pl-input"
            />
          </label>
          <label>
            <span className="pl-label">Status</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="pl-select">
              <option value="all">Todos</option>
              <option value="paid">Pago</option>
              <option value="pending">Pendente</option>
              <option value="failed">Falhou</option>
              <option value="canceled">Cancelado</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <label>
            <span className="pl-label">Afiliado</span>
            <select value={affiliateFilter} onChange={(e) => setAffiliateFilter(e.target.value)} className="pl-select">
              <option value="all">Todos</option>
              <option value="with_affiliate">Com afiliado</option>
              <option value="without_affiliate">Sem afiliado</option>
            </select>
          </label>
          <label>
            <span className="pl-label">Data inicial</span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="pl-input" />
          </label>
          <label>
            <span className="pl-label">Data final</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="pl-input" />
          </label>
          <label>
            <span className="pl-label">Ordenar</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="pl-select">
              <option value="newest">Mais recentes</option>
              <option value="oldest">Mais antigas</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={setLast7Days} className="pl-btn px-3 py-2 text-xs">
            Últimos 7 dias
          </button>
          <button onClick={setThisMonth} className="pl-btn px-3 py-2 text-xs">
            Este mês
          </button>
          <button onClick={clearFilters} className="pl-btn pl-btn-danger px-3 py-2 text-xs">
            Limpar filtros
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="pl-card p-5">
          <div className="text-xs font-black uppercase text-[var(--panel-muted)]">Pedidos filtrados</div>
          <div className="mt-2 text-3xl font-black">{loading ? "-" : stats.totalRows}</div>
          <div className="mt-1 text-sm text-[var(--panel-muted)]">no período selecionado</div>
        </div>
        <div className="pl-card p-5">
          <div className="text-xs font-black uppercase text-[var(--panel-muted)]">Pagos</div>
          <div className="mt-2 text-3xl font-black text-[var(--panel-green-2)]">{loading ? "-" : stats.paidCount}</div>
          <div className="mt-1 text-sm text-[var(--panel-muted)]">{loading ? "-" : stats.paidAmountLabel}</div>
        </div>
        <div className="pl-card p-5">
          <div className="text-xs font-black uppercase text-[var(--panel-muted)]">Pendentes</div>
          <div className="mt-2 text-3xl font-black text-[var(--panel-amber)]">{loading ? "-" : stats.pendingCount}</div>
          <div className="mt-1 text-sm text-[var(--panel-muted)]">aguardando PIX</div>
        </div>
        <div className="pl-card p-5">
          <div className="text-xs font-black uppercase text-[var(--panel-muted)]">Cancelados / falhos</div>
          <div className="mt-2 text-3xl font-black text-[var(--panel-red)]">{loading ? "-" : stats.canceledCount}</div>
          <div className="mt-1 text-sm text-[var(--panel-muted)]">sem crédito liberado</div>
        </div>
      </div>

      <div className="pl-card p-5">
        <div className="overflow-x-auto">
          <table className="pl-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>E-mail</th>
                <th>WhatsApp</th>
                <th>Total</th>
                <th>Gasto do cliente</th>
                <th>Status</th>
                <th>Afiliado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-6 text-[var(--panel-muted)]">
                    Carregando...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-[var(--panel-muted)]">
                    Nenhuma compra encontrada com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredRows.map((o) => (
                  <tr key={o.id} className="hover:bg-[#f8fbfa]">
                    <td className="text-[var(--panel-muted)]">{fmt(o.created_at)}</td>
                    <td>
                      <div className="font-black">{o.email || "-"}</div>
                      <div className="text-[11px] text-[var(--panel-muted)]">{o.id}</div>
                    </td>
                    <td>
                      {o.whatsapp ? (
                        <a
                          href={`https://wa.me/${String(o.whatsapp).replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-[var(--panel-green-2)]"
                        >
                          {o.whatsapp}
                        </a>
                      ) : (
                        <span className="text-[var(--panel-muted)]">-</span>
                      )}
                    </td>
                    <td className="font-black">{o.total_label}</td>
                    <td className="font-black">{o.customer_total_label || "-"}</td>
                    <td>
                      <span className={badgeClass(o.status)}>{o.status_label}</span>
                    </td>
                    <td>
                      {o.affiliate_code ? (
                        <span className="pl-badge">{o.affiliate_code}</span>
                      ) : (
                        <span className="text-[var(--panel-muted)]">sem afiliado</span>
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
