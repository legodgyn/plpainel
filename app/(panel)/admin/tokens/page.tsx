"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type RecentOrder = {
  id: string;
  created_at: string | null;
  status: string;
  tokens: number;
  total_cents: number;
  total_label: string;
  mp_payment_id: string | null;
};

type RecentSite = {
  id: string;
  created_at: string | null;
  company_name: string | null;
  domain: string | null;
};

type UserRow = {
  user_id: string;
  created_at: string | null;
  name: string | null;
  email: string | null;
  whatsapp: string | null;
  token_balance: number;
  total_spent_cents: number;
  total_spent_label: string;
  purchased_tokens: number;
  paid_orders_count: number;
  pending_orders_count: number;
  sites_count: number;
  balance_gap: number;
  last_order_at: string | null;
  last_site_at: string | null;
  last_activity_at: string | null;
  recent_orders: RecentOrder[];
  recent_sites: RecentSite[];
};

type Summary = {
  total_users: number;
  total_balance: number;
  total_purchased_tokens: number;
  total_spent_cents: number;
  total_spent_label: string;
  total_sites: number;
  paid_orders: number;
  pending_orders: number;
  zero_balance: number;
  low_balance: number;
  healthy_balance: number;
};

type ToastState = {
  type: "success" | "error";
  text: string;
} | null;

const emptySummary: Summary = {
  total_users: 0,
  total_balance: 0,
  total_purchased_tokens: 0,
  total_spent_cents: 0,
  total_spent_label: "R$ 0,00",
  total_sites: 0,
  paid_orders: 0,
  pending_orders: 0,
  zero_balance: 0,
  low_balance: 0,
  healthy_balance: 0,
};

function tokenBadgeClass(balance: number) {
  if (balance <= 0) return "pl-badge pl-badge-danger";
  if (balance < 10) return "pl-badge pl-badge-warn";
  return "pl-badge pl-badge-ok";
}

function gapBadgeClass(gap: number) {
  if (gap === 0) return "pl-badge pl-badge-ok";
  if (gap > 0) return "pl-badge pl-badge-warn";
  return "pl-badge pl-badge-danger";
}

function fmtDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("pt-BR");
  } catch {
    return value;
  }
}

function orderStatusLabel(status: string) {
  if (status === "paid") return "Pago";
  if (status === "pending") return "Pendente";
  if (status === "refunded") return "Estornado";
  if (status === "failed") return "Falhou";
  return status || "-";
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export default function AdminTokensPage() {
  const supabase = useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [search, setSearch] = useState("");
  const [balanceFilter, setBalanceFilter] = useState("all");
  const [purchaseFilter, setPurchaseFilter] = useState("all");
  const [sortBy, setSortBy] = useState("balance_desc");
  const [mode, setMode] = useState<"add" | "remove" | "set">("add");
  const [amount, setAmount] = useState("10");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  function showToast(type: "success" | "error", text: string) {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 3500);
  }

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }, [supabase]);

  const loadUsers = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);

      try {
        const token = await getToken();
        if (!token) {
          showToast("error", "Voce precisa estar logado.");
          return;
        }

        const res = await fetch("/api/admin/tokens", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok || !json?.ok) {
          showToast("error", json?.error || "Erro ao carregar tokens.");
          return;
        }

        const nextUsers = (json.users || []) as UserRow[];
        setUsers(nextUsers);
        setSummary(json.summary || emptySummary);

        if (selectedUserId && !nextUsers.some((user) => user.user_id === selectedUserId)) {
          setSelectedUserId("");
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [getToken, selectedUserId]
  );

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadUsers(true);
      }
    }, 20000);

    return () => window.clearInterval(timer);
  }, [loadUsers]);

  const selectedUser = users.find((user) => user.user_id === selectedUserId) || null;
  const amountNumber = Math.trunc(Number(amount || 0));
  const previewBalance = selectedUser
    ? mode === "set"
      ? Math.max(0, amountNumber || 0)
      : mode === "add"
      ? Number(selectedUser.token_balance || 0) + Math.max(0, amountNumber || 0)
      : Math.max(0, Number(selectedUser.token_balance || 0) - Math.max(0, amountNumber || 0))
    : 0;

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    const result = users.filter((user) => {
      const balance = Number(user.token_balance || 0);
      const bought = Number(user.purchased_tokens || 0);
      const hasPending = Number(user.pending_orders_count || 0) > 0;

      if (balanceFilter === "zero" && balance > 0) return false;
      if (balanceFilter === "low" && (balance <= 0 || balance >= 10)) return false;
      if (balanceFilter === "healthy" && balance < 10) return false;
      if (purchaseFilter === "buyers" && bought <= 0) return false;
      if (purchaseFilter === "never" && bought > 0) return false;
      if (purchaseFilter === "pending" && !hasPending) return false;
      if (purchaseFilter === "gap" && Number(user.balance_gap || 0) === 0) return false;

      if (!term) return true;

      const haystack = [
        user.name || "",
        user.email || "",
        user.whatsapp || "",
        user.user_id,
        user.total_spent_label || "",
        String(user.token_balance || 0),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });

    result.sort((a, b) => {
      if (sortBy === "balance_asc") return Number(a.token_balance || 0) - Number(b.token_balance || 0);
      if (sortBy === "spent_desc") return Number(b.total_spent_cents || 0) - Number(a.total_spent_cents || 0);
      if (sortBy === "purchased_desc") return Number(b.purchased_tokens || 0) - Number(a.purchased_tokens || 0);
      if (sortBy === "sites_desc") return Number(b.sites_count || 0) - Number(a.sites_count || 0);
      if (sortBy === "recent") {
        return new Date(b.last_activity_at || 0).getTime() - new Date(a.last_activity_at || 0).getTime();
      }
      return Number(b.token_balance || 0) - Number(a.token_balance || 0);
    });

    return result;
  }, [users, search, balanceFilter, purchaseFilter, sortBy]);

  async function copyUserId(userId: string) {
    await navigator.clipboard.writeText(userId);
    showToast("success", "ID do usuario copiado.");
  }

  function exportCsv() {
    const header = [
      "Nome",
      "Email",
      "WhatsApp",
      "Saldo atual",
      "Tokens comprados",
      "Sites criados",
      "Ajuste estimado",
      "Total gasto",
      "Pedidos pagos",
      "Pedidos pendentes",
      "Ultima atividade",
      "User ID",
    ];

    const lines = filteredUsers.map((user) =>
      [
        user.name || "",
        user.email || "",
        user.whatsapp || "",
        user.token_balance,
        user.purchased_tokens,
        user.sites_count,
        user.balance_gap,
        user.total_spent_label,
        user.paid_orders_count,
        user.pending_orders_count,
        fmtDate(user.last_activity_at),
        user.user_id,
      ]
        .map(csvCell)
        .join(",")
    );

    const csv = [header.map(csvCell).join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `controle-tokens-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function saveTokens() {
    if (!selectedUserId) {
      showToast("error", "Selecione um usuario.");
      return;
    }

    const qty = Math.trunc(Number(amount || 0));
    if (!Number.isFinite(qty) || qty < 0) {
      showToast("error", "Informe uma quantidade valida.");
      return;
    }

    if ((mode === "add" || mode === "remove") && qty === 0) {
      showToast("error", "Informe uma quantidade maior que zero.");
      return;
    }

    setSaving(true);

    try {
      const token = await getToken();
      if (!token) {
        showToast("error", "Voce precisa estar logado.");
        return;
      }

      const res = await fetch("/api/admin/tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: selectedUserId,
          mode,
          amount: qty,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        showToast("error", json?.error || "Erro ao salvar tokens.");
        return;
      }

      setUsers(json.users || []);
      setSummary(json.summary || emptySummary);
      showToast("success", `Saldo atualizado para ${json.balance} tokens.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="pl-page max-w-7xl space-y-6">
      <div className="pl-page-title">
        <div>
          <span className="pl-badge">Admin</span>
          <h1>Controle de Tokens</h1>
          <p>Saldos, compras, consumo por sites e ajustes manuais em um so lugar.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportCsv} className="pl-btn">
            Exportar CSV
          </button>
          <button type="button" onClick={() => loadUsers()} className="pl-btn pl-btn-primary">
            Atualizar
          </button>
        </div>
      </div>

      {toast ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
            toast.type === "success"
              ? "border-[var(--panel-ok-line)] bg-[var(--panel-ok-bg)] text-[var(--panel-ok-text)]"
              : "border-[var(--panel-danger-line)] bg-[var(--panel-danger-bg)] text-[var(--panel-danger-text)]"
          }`}
        >
          {toast.text}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="pl-card-soft">
          <div className="text-sm font-bold text-[var(--panel-muted)]">Usuarios</div>
          <div className="mt-2 text-3xl font-black text-[var(--panel-ink)]">{summary.total_users}</div>
          <div className="mt-1 text-xs font-semibold text-[var(--panel-muted)]">{filteredUsers.length} visiveis</div>
        </div>
        <div className="pl-card-soft">
          <div className="text-sm font-bold text-[var(--panel-muted)]">Saldo em contas</div>
          <div className="mt-2 text-3xl font-black text-[var(--panel-ink)]">{summary.total_balance}</div>
          <div className="mt-1 text-xs font-semibold text-[var(--panel-muted)]">tokens disponiveis</div>
        </div>
        <div className="pl-card-soft">
          <div className="text-sm font-bold text-[var(--panel-muted)]">Tokens comprados</div>
          <div className="mt-2 text-3xl font-black text-[var(--panel-ink)]">{summary.total_purchased_tokens}</div>
          <div className="mt-1 text-xs font-semibold text-[var(--panel-muted)]">{summary.total_spent_label}</div>
        </div>
        <div className="pl-card-soft">
          <div className="text-sm font-bold text-[var(--panel-muted)]">Sites criados</div>
          <div className="mt-2 text-3xl font-black text-[var(--panel-ink)]">{summary.total_sites}</div>
          <div className="mt-1 text-xs font-semibold text-[var(--panel-muted)]">consumo estimado</div>
        </div>
        <div className="pl-card-soft">
          <div className="text-sm font-bold text-[var(--panel-muted)]">Alertas</div>
          <div className="mt-2 text-3xl font-black text-[var(--panel-ink)]">
            {summary.zero_balance + summary.low_balance}
          </div>
          <div className="mt-1 text-xs font-semibold text-[var(--panel-muted)]">
            {summary.zero_balance} zerados, {summary.low_balance} baixos
          </div>
        </div>
      </section>

      <section className="pl-card p-5">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_.8fr_.9fr_.9fr]">
          <label>
            <span className="pl-label">Buscar</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome, email, WhatsApp, saldo ou ID..."
              className="pl-input mt-2"
            />
          </label>

          <label>
            <span className="pl-label">Saldo</span>
            <select value={balanceFilter} onChange={(event) => setBalanceFilter(event.target.value)} className="pl-select mt-2">
              <option value="all">Todos</option>
              <option value="zero">0 tokens</option>
              <option value="low">1 a 9 tokens</option>
              <option value="healthy">10+ tokens</option>
            </select>
          </label>

          <label>
            <span className="pl-label">Compra</span>
            <select value={purchaseFilter} onChange={(event) => setPurchaseFilter(event.target.value)} className="pl-select mt-2">
              <option value="all">Todos</option>
              <option value="buyers">Ja compraram</option>
              <option value="never">Nunca compraram</option>
              <option value="pending">Com PIX pendente</option>
              <option value="gap">Com ajuste estimado</option>
            </select>
          </label>

          <label>
            <span className="pl-label">Ordenar</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="pl-select mt-2">
              <option value="balance_desc">Maior saldo</option>
              <option value="balance_asc">Menor saldo</option>
              <option value="spent_desc">Maior gasto</option>
              <option value="purchased_desc">Mais tokens comprados</option>
              <option value="sites_desc">Mais sites</option>
              <option value="recent">Atividade recente</option>
            </select>
          </label>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
        <section className="pl-card overflow-hidden p-0">
          <div className="border-b border-[var(--panel-line)] p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-black">Usuarios e saldos</h2>
                <p className="mt-1 text-sm text-[var(--panel-muted)]">
                  O ajuste estimado e saldo atual + sites criados - tokens comprados.
                </p>
              </div>
              <span className="pl-badge">{loading ? "Carregando..." : `${filteredUsers.length} usuarios`}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="pl-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Saldo</th>
                  <th>Compras</th>
                  <th>Sites</th>
                  <th>Ajuste</th>
                  <th>Acao</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6}>Carregando...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6}>Nenhum usuario encontrado.</td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const balance = Number(user.token_balance || 0);
                    const selected = selectedUserId === user.user_id;

                    return (
                      <tr key={user.user_id} className={selected ? "bg-[var(--panel-ok-bg)]" : ""}>
                        <td>
                          <div className="font-black text-[var(--panel-ink)]">{user.name || "Sem nome"}</div>
                          <div className="mt-1 break-all text-xs font-semibold text-[var(--panel-muted)]">
                            {user.email || "Sem email"}
                          </div>
                          <div className="mt-1 text-xs text-[var(--panel-muted)]">
                            {user.whatsapp || "-"} | {fmtDate(user.last_activity_at)}
                          </div>
                        </td>
                        <td>
                          <span className={tokenBadgeClass(balance)}>{balance} tokens</span>
                        </td>
                        <td>
                          <div className="font-black">{user.purchased_tokens} tokens</div>
                          <div className="mt-1 text-xs text-[var(--panel-muted)]">
                            {user.total_spent_label} | {user.paid_orders_count} pagos
                          </div>
                          {user.pending_orders_count > 0 ? (
                            <div className="mt-1 text-xs font-bold text-[var(--panel-amber)]">
                              {user.pending_orders_count} pendente(s)
                            </div>
                          ) : null}
                        </td>
                        <td>
                          <div className="font-black">{user.sites_count}</div>
                          <div className="mt-1 text-xs text-[var(--panel-muted)]">{fmtDate(user.last_site_at)}</div>
                        </td>
                        <td>
                          <span className={gapBadgeClass(Number(user.balance_gap || 0))}>
                            {Number(user.balance_gap || 0) > 0 ? "+" : ""}
                            {user.balance_gap}
                          </span>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedUserId(user.user_id)}
                              className="pl-btn py-2 text-xs"
                            >
                              Selecionar
                            </button>
                            <button
                              type="button"
                              onClick={() => copyUserId(user.user_id)}
                              className="pl-btn py-2 text-xs"
                            >
                              Copiar ID
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="pl-card space-y-5">
            <div>
              <h2 className="text-xl font-black">Ajustar saldo</h2>
              <p className="mt-1 text-sm text-[var(--panel-muted)]">
                A alteracao entra imediatamente para criacao de sites.
              </p>
            </div>

            {selectedUser ? (
              <div className="rounded-2xl border border-[var(--panel-line)] bg-[var(--panel-hover)] p-4">
                <div className="text-xs font-black uppercase text-[var(--panel-muted)]">Usuario selecionado</div>
                <div className="mt-2 font-black">{selectedUser.name || "Sem nome"}</div>
                <div className="mt-1 break-all text-sm text-[var(--panel-muted)]">
                  {selectedUser.email || selectedUser.user_id}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-3xl font-black text-[var(--panel-green-2)]">{selectedUser.token_balance}</div>
                    <div className="text-xs font-bold text-[var(--panel-muted)]">saldo atual</div>
                  </div>
                  <div>
                    <div className="text-3xl font-black text-[var(--panel-ink)]">{previewBalance}</div>
                    <div className="text-xs font-bold text-[var(--panel-muted)]">apos salvar</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="pl-card-soft text-sm font-semibold text-[var(--panel-muted)]">
                Selecione um usuario na tabela para liberar o ajuste.
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {[1, 5, 10, 25, 50, 100].map((qty) => (
                <button key={qty} type="button" onClick={() => setAmount(String(qty))} className="pl-btn justify-center py-2 text-xs">
                  {qty}
                </button>
              ))}
            </div>

            <div>
              <label className="pl-label">Acao</label>
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value as "add" | "remove" | "set")}
                className="pl-select mt-2"
              >
                <option value="add">Adicionar tokens</option>
                <option value="remove">Remover tokens</option>
                <option value="set">Definir saldo exato</option>
              </select>
            </div>

            <div>
              <label className="pl-label">Quantidade</label>
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))}
                placeholder="Ex: 10"
                className="pl-input mt-2"
                inputMode="numeric"
              />
            </div>

            <button
              type="button"
              onClick={saveTokens}
              disabled={!selectedUser || saving}
              className="pl-btn pl-btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar ajuste"}
            </button>

            {selectedUser ? (
              <button
                type="button"
                onClick={() => {
                  setMode("set");
                  setAmount("0");
                }}
                className="pl-btn pl-btn-danger w-full justify-center"
              >
                Preparar zerar saldo
              </button>
            ) : null}
          </section>

          {selectedUser ? (
            <section className="pl-card space-y-5">
              <div>
                <h2 className="text-xl font-black">Historico rapido</h2>
                <p className="mt-1 text-sm text-[var(--panel-muted)]">
                  Compras e sites mais recentes desse usuario.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-[var(--panel-line)] p-3">
                  <div className="text-xl font-black">{selectedUser.purchased_tokens}</div>
                  <div className="text-xs font-bold text-[var(--panel-muted)]">comprados</div>
                </div>
                <div className="rounded-2xl border border-[var(--panel-line)] p-3">
                  <div className="text-xl font-black">{selectedUser.sites_count}</div>
                  <div className="text-xs font-bold text-[var(--panel-muted)]">sites</div>
                </div>
                <div className="rounded-2xl border border-[var(--panel-line)] p-3">
                  <div className="text-xl font-black">{selectedUser.balance_gap}</div>
                  <div className="text-xs font-bold text-[var(--panel-muted)]">ajuste</div>
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm font-black text-[var(--panel-ink)]">Compras recentes</div>
                <div className="space-y-2">
                  {selectedUser.recent_orders.length === 0 ? (
                    <div className="text-sm text-[var(--panel-muted)]">Nenhuma compra encontrada.</div>
                  ) : (
                    selectedUser.recent_orders.map((order) => (
                      <div key={order.id} className="rounded-2xl border border-[var(--panel-line)] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-black">{order.tokens} tokens</span>
                          <span className={order.status === "paid" ? "pl-badge pl-badge-ok" : "pl-badge"}>
                            {orderStatusLabel(order.status)}
                          </span>
                        </div>
                        <div className="mt-1 text-xs font-semibold text-[var(--panel-muted)]">
                          {order.total_label} | {fmtDate(order.created_at)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm font-black text-[var(--panel-ink)]">Sites recentes</div>
                <div className="space-y-2">
                  {selectedUser.recent_sites.length === 0 ? (
                    <div className="text-sm text-[var(--panel-muted)]">Nenhum site encontrado.</div>
                  ) : (
                    selectedUser.recent_sites.map((site) => (
                      <div key={site.id} className="rounded-2xl border border-[var(--panel-line)] p-3">
                        <div className="font-black">{site.company_name || site.domain || "Site sem nome"}</div>
                        <div className="mt-1 break-all text-xs font-semibold text-[var(--panel-muted)]">
                          {site.domain || "-"} | {fmtDate(site.created_at)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
