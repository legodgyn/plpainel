"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type UserRow = {
  user_id: string;
  name: string | null;
  whatsapp: string | null;
};

type Permissions = {
  user_id: string;
  can_change_layout: boolean;
  can_transfer_sites: boolean;
  can_view_orders: boolean;
  can_manage_suggestions: boolean;
  can_use_custom_domain: boolean;
};

type ToastState = {
  type: "success" | "error";
  text: string;
} | null;

const initialPermissions: Permissions = {
  user_id: "",
  can_change_layout: false,
  can_transfer_sites: false,
  can_view_orders: false,
  can_manage_suggestions: false,
  can_use_custom_domain: false,
};

const permissionCards = [
  {
    key: "can_change_layout",
    title: "Alterar layout",
    description: "Libera a pagina de alteracao de layout dos sites.",
  },
  {
    key: "can_transfer_sites",
    title: "Transferir sites",
    description: "Permite transferir sites entre usuarios da plataforma.",
  },
  {
    key: "can_view_orders",
    title: "Compras na plataforma",
    description: "Libera a tela administrativa de pedidos e compras.",
  },
  {
    key: "can_manage_suggestions",
    title: "Sugestoes admin",
    description: "Permite responder e gerenciar sugestoes recebidas.",
  },
] as const;

export default function AdminPermissoesPage() {
  const supabase = useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [permissions, setPermissions] = useState<Permissions>(initialPermissions);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<ToastState>(null);

  function showToast(type: "success" | "error", text: string) {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 3000);
  }

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }

  async function loadUsers() {
    setLoadingUsers(true);

    try {
      const token = await getToken();
      if (!token) {
        showToast("error", "Voce precisa estar logado.");
        return;
      }

      const res = await fetch("/api/admin/users-simple", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        showToast("error", json?.error || "Erro ao carregar usuarios.");
        return;
      }

      setUsers(json.users || []);
    } finally {
      setLoadingUsers(false);
    }
  }

  async function loadPermissions(userId: string) {
    if (!userId) {
      setPermissions(initialPermissions);
      return;
    }

    setLoadingPermissions(true);

    try {
      const token = await getToken();
      if (!token) {
        showToast("error", "Voce precisa estar logado.");
        return;
      }

      const res = await fetch(
        `/api/admin/user-extra-permissions/get?user_id=${encodeURIComponent(userId)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        showToast("error", json?.error || "Erro ao carregar permissoes.");
        return;
      }

      setPermissions({ ...initialPermissions, ...json.permissions });
    } finally {
      setLoadingPermissions(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      loadPermissions(selectedUserId);
    } else {
      setPermissions(initialPermissions);
    }
  }, [selectedUserId]);

  async function savePermissions() {
    if (!selectedUserId) {
      showToast("error", "Selecione um usuario.");
      return;
    }

    setSaving(true);

    try {
      const token = await getToken();
      if (!token) {
        showToast("error", "Voce precisa estar logado.");
        return;
      }

      const res = await fetch("/api/admin/user-extra-permissions/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...permissions,
          user_id: selectedUserId,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        showToast("error", json?.error || "Erro ao salvar permissoes.");
        return;
      }

      showToast("success", "Permissoes salvas com sucesso.");
    } finally {
      setSaving(false);
    }
  }

  const filteredUsers = users.filter((user) => {
    const haystack = `${user.name || ""} ${user.whatsapp || ""} ${user.user_id}`.toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });

  const selectedUser = users.find((user) => user.user_id === selectedUserId) || null;

  return (
    <div className="pl-page space-y-6">
      <div className="pl-page-title">
        <div>
          <span className="pl-badge">Admin</span>
          <h1>Permissoes extras</h1>
          <p>
            As funcoes basicas continuam liberadas para todos. Aqui voce controla apenas acessos administrativos.
          </p>
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

      <div className="grid gap-5 xl:grid-cols-[390px_1fr]">
        <section className="pl-card overflow-hidden p-0">
          <div className="border-b border-[var(--panel-line)] p-5">
            <h2 className="text-xl font-black">Selecionar usuario</h2>
            <p className="mt-1 text-sm text-[var(--panel-muted)]">
              Busque pelo nome, WhatsApp ou ID do cliente.
            </p>
          </div>

          <div className="p-5">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, WhatsApp ou ID..."
              className="pl-input"
            />

            <div className="mt-4 max-h-[560px] space-y-2 overflow-y-auto pr-1">
              {loadingUsers ? (
                <div className="pl-card-soft text-sm font-semibold text-[var(--panel-muted)]">
                  Carregando usuarios...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="pl-card-soft text-sm font-semibold text-[var(--panel-muted)]">
                  Nenhum usuario encontrado.
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const selected = selectedUserId === user.user_id;

                  return (
                    <button
                      key={user.user_id}
                      onClick={() => setSelectedUserId(user.user_id)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        selected
                          ? "border-[var(--panel-nav-active-line)] bg-[var(--panel-nav-active-bg)] text-[var(--panel-nav-active-text)]"
                          : "border-[var(--panel-line)] bg-[var(--panel-surface)] hover:bg-[var(--panel-hover)]"
                      }`}
                    >
                      <div className="truncate font-black">{user.name || "Sem nome"}</div>
                      <div className="mt-1 truncate text-sm font-semibold text-[var(--panel-muted)]">
                        {user.whatsapp || "Sem WhatsApp"}
                      </div>
                      <div className="mt-1 break-all text-xs text-[var(--panel-muted)]">
                        {user.user_id}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </section>

        <section className="pl-card overflow-hidden p-0">
          <div className="border-b border-[var(--panel-line)] p-5">
            <h2 className="text-xl font-black">Acessos liberados</h2>
            <p className="mt-1 text-sm text-[var(--panel-muted)]">
              Escolha um usuario para configurar as permissoes extras.
            </p>
          </div>

          <div className="p-5">
            {!selectedUserId ? (
              <div className="pl-card-soft text-sm font-semibold text-[var(--panel-muted)]">
                Selecione um usuario na lista para editar as permissoes.
              </div>
            ) : loadingPermissions ? (
              <div className="pl-card-soft text-sm font-semibold text-[var(--panel-muted)]">
                Carregando permissoes...
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-2xl border border-[var(--panel-line)] bg-[var(--panel-hover)] p-4">
                  <div className="text-sm font-black text-[var(--panel-muted)]">
                    Usuario selecionado
                  </div>
                  <div className="mt-2 text-lg font-black">
                    {selectedUser?.name || "Sem nome"}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[var(--panel-muted)]">
                    {selectedUser?.whatsapp || "Sem WhatsApp"}
                  </div>
                  <div className="mt-1 break-all text-xs text-[var(--panel-muted)]">
                    {selectedUser?.user_id}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {permissionCards.map((item) => {
                    const checked = permissions[item.key];

                    return (
                      <label
                        key={item.key}
                        className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition ${
                          checked
                            ? "border-[var(--panel-ok-line)] bg-[var(--panel-ok-bg)]"
                            : "border-[var(--panel-line)] bg-[var(--panel-surface)] hover:bg-[var(--panel-hover)]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) =>
                            setPermissions((prev) => ({
                              ...prev,
                              [item.key]: event.target.checked,
                            }))
                          }
                          className="mt-1 h-4 w-4 accent-[var(--panel-green)]"
                        />
                        <span>
                          <span className="block font-black">{item.title}</span>
                          <span className="mt-1 block text-sm text-[var(--panel-muted)]">
                            {item.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={savePermissions}
                    disabled={saving}
                    className="pl-btn pl-btn-primary"
                  >
                    {saving ? "Salvando..." : "Salvar permissoes"}
                  </button>

                  <button
                    onClick={() => loadPermissions(selectedUserId)}
                    disabled={saving}
                    className="pl-btn"
                  >
                    Recarregar
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
