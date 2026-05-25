"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type UserRow = {
  user_id: string;
  created_at: string | null;
  name: string | null;
  email: string | null;
  whatsapp: string | null;
  token_balance: number;
  total_spent_cents: number;
  total_spent_label: string;
};

type ToastState = {
  type: "success" | "error";
  text: string;
} | null;

function tokenBadgeClass(balance: number) {
  if (balance <= 0) return "pl-badge pl-badge-danger";
  if (balance < 10) return "pl-badge pl-badge-warn";
  return "pl-badge pl-badge-ok";
}

function fmtDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("pt-BR");
  } catch {
    return value;
  }
}

export default function AdminTokensPage() {
  const supabase = useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"add" | "remove" | "set">("add");
  const [amount, setAmount] = useState("10");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  function showToast(type: "success" | "error", text: string) {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 3500);
  }

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }

  async function loadUsers() {
    setLoading(true);

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

      setUsers(json.users || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;

    return users.filter((user) => {
      const haystack = `${user.name || ""} ${user.email || ""} ${user.whatsapp || ""} ${user.user_id}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [users, search]);

  const selectedUser = users.find((user) => user.user_id === selectedUserId) || null;
  const totalTokens = users.reduce((sum, user) => sum + Number(user.token_balance || 0), 0);
  const zeroTokens = users.filter((user) => Number(user.token_balance || 0) <= 0).length;
  const highTokens = users.filter((user) => Number(user.token_balance || 0) >= 10).length;

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
          <p>Veja saldos dos usuarios e ajuste tokens sem abrir o Supabase.</p>
        </div>

        <button type="button" onClick={loadUsers} className="pl-btn">
          Atualizar
        </button>
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

      <section className="grid gap-4 md:grid-cols-3">
        <div className="pl-card-soft">
          <div className="text-sm font-bold text-[var(--panel-muted)]">Tokens em contas</div>
          <div className="mt-2 text-3xl font-black text-[var(--panel-ink)]">{totalTokens}</div>
        </div>
        <div className="pl-card-soft">
          <div className="text-sm font-bold text-[var(--panel-muted)]">Usuarios sem token</div>
          <div className="mt-2 text-3xl font-black text-[var(--panel-ink)]">{zeroTokens}</div>
        </div>
        <div className="pl-card-soft">
          <div className="text-sm font-bold text-[var(--panel-muted)]">Usuarios com 10+</div>
          <div className="mt-2 text-3xl font-black text-[var(--panel-ink)]">{highTokens}</div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="pl-card overflow-hidden p-0">
          <div className="border-b border-[var(--panel-line)] p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-black">Usuarios e saldos</h2>
                <p className="mt-1 text-sm text-[var(--panel-muted)]">
                  Busque por nome, email, WhatsApp ou ID.
                </p>
              </div>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar usuario..."
                className="pl-input md:max-w-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="pl-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Contato</th>
                  <th>Gasto</th>
                  <th>Tokens</th>
                  <th>Acao</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5}>Carregando...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5}>Nenhum usuario encontrado.</td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const balance = Number(user.token_balance || 0);
                    const selected = selectedUserId === user.user_id;

                    return (
                      <tr key={user.user_id} className={selected ? "bg-[var(--panel-ok-bg)]" : ""}>
                        <td>
                          <div className="font-black text-[var(--panel-ink)]">{user.name || "Sem nome"}</div>
                          <div className="mt-1 text-xs font-semibold text-[var(--panel-muted)]">
                            Criado em {fmtDate(user.created_at)}
                          </div>
                          <div className="mt-1 max-w-[260px] truncate text-xs text-[var(--panel-muted)]">
                            {user.user_id}
                          </div>
                        </td>
                        <td>
                          <div className="font-semibold">{user.email || "-"}</div>
                          <div className="mt-1 text-xs text-[var(--panel-muted)]">{user.whatsapp || "-"}</div>
                        </td>
                        <td className="font-black">{user.total_spent_label}</td>
                        <td>
                          <span className={tokenBadgeClass(balance)}>{balance} tokens</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => setSelectedUserId(user.user_id)}
                            className="pl-btn py-2 text-xs"
                          >
                            Selecionar
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="pl-card h-fit space-y-5">
          <div>
            <h2 className="text-xl font-black">Ajustar saldo</h2>
            <p className="mt-1 text-sm text-[var(--panel-muted)]">
              Escolha um usuario e defina como os tokens serao alterados.
            </p>
          </div>

          {selectedUser ? (
            <div className="rounded-2xl border border-[var(--panel-line)] bg-[var(--panel-hover)] p-4">
              <div className="text-xs font-black uppercase text-[var(--panel-muted)]">Usuario selecionado</div>
              <div className="mt-2 font-black">{selectedUser.name || "Sem nome"}</div>
              <div className="mt-1 break-all text-sm text-[var(--panel-muted)]">
                {selectedUser.email || selectedUser.user_id}
              </div>
              <div className="mt-3 text-4xl font-black text-[var(--panel-green-2)]">
                {selectedUser.token_balance}
              </div>
              <div className="text-sm font-semibold text-[var(--panel-muted)]">tokens atuais</div>
            </div>
          ) : (
            <div className="pl-card-soft text-sm font-semibold text-[var(--panel-muted)]">
              Selecione um usuario na tabela para liberar o ajuste.
            </div>
          )}

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

          <div className="rounded-2xl border border-[var(--panel-warn-line)] bg-[var(--panel-warn-bg)] p-4 text-sm font-semibold text-[var(--panel-warn-text)]">
            Use remover com cuidado: o saldo nunca fica negativo, mas a alteracao vale imediatamente para criacao de sites.
          </div>
        </aside>
      </div>
    </main>
  );
}
