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
        showToast("error", "Você precisa estar logado.");
        return;
      }

      const res = await fetch("/api/admin/users-simple", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        showToast("error", json?.error || "Erro ao carregar usuários.");
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
        showToast("error", "Você precisa estar logado.");
        return;
      }

      const res = await fetch(
        `/api/admin/user-extra-permissions/get?user_id=${encodeURIComponent(userId)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        showToast("error", json?.error || "Erro ao carregar permissões.");
        return;
      }

      setPermissions(json.permissions);
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
      showToast("error", "Selecione um usuário.");
      return;
    }

    setSaving(true);

    try {
      const token = await getToken();
      if (!token) {
        showToast("error", "Você precisa estar logado.");
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
        showToast("error", json?.error || "Erro ao salvar permissões.");
        return;
      }

      showToast("success", "Permissões salvas com sucesso.");
    } finally {
      setSaving(false);
    }
  }

  const filteredUsers = users.filter((u) => {
    const haystack = `${u.name || ""} ${u.whatsapp || ""} ${u.user_id}`.toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });

  const selectedUser = users.find((u) => u.user_id === selectedUserId) || null;

  return (
    <div className="space-y-6 text-white">
      {toast ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            toast.type === "success"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/20 bg-red-500/10 text-red-200"
          }`}
        >
          {toast.text}
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-xl font-semibold">Permissões extras</h1>
        <p className="mt-1 text-sm text-white/60">
          As funções básicas continuam liberadas para todos. Aqui você controla apenas os acessos extras.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold">Selecionar usuário</div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, WhatsApp ou ID..."
            className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-violet-400"
          />

          <div className="mt-4 max-h-[520px] space-y-2 overflow-y-auto">
            {loadingUsers ? (
              <div className="text-sm text-white/60">Carregando usuários...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-sm text-white/60">Nenhum usuário encontrado.</div>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.user_id}
                  onClick={() => setSelectedUserId(user.user_id)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    selectedUserId === user.user_id
                      ? "border-violet-500/30 bg-violet-500/10"
                      : "border-white/10 bg-black/20 hover:bg-white/5"
                  }`}
                >
                  <div className="font-semibold text-white">{user.name || "Sem nome"}</div>
                  <div className="mt-1 text-xs text-white/50">{user.whatsapp || "Sem WhatsApp"}</div>
                  <div className="mt-1 break-all text-[11px] text-white/30">{user.user_id}</div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          {!selectedUserId ? (
            <div className="text-sm text-white/60">
              Selecione um usuário para editar as permissões extras.
            </div>
          ) : loadingPermissions ? (
            <div className="text-sm text-white/60">Carregando permissões...</div>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="text-sm font-semibold">Usuário selecionado</div>
                <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="font-semibold">{selectedUser?.name || "Sem nome"}</div>
                  <div className="mt-1 text-sm text-white/60">{selectedUser?.whatsapp || "Sem WhatsApp"}</div>
                  <div className="mt-1 break-all text-xs text-white/35">{selectedUser?.user_id}</div>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold">Funções extras</div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
                    <input
                      type="checkbox"
                      checked={permissions.can_change_layout}
                      onChange={(e) =>
                        setPermissions((prev) => ({
                          ...prev,
                          can_change_layout: e.target.checked,
                        }))
                      }
                    />
                    <div>
                      <div className="font-semibold">Alterar layout</div>
                      <div className="text-xs text-white/50">Libera a página de alteração de layout.</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
                    <input
                      type="checkbox"
                      checked={permissions.can_transfer_sites}
                      onChange={(e) =>
                        setPermissions((prev) => ({
                          ...prev,
                          can_transfer_sites: e.target.checked,
                        }))
                      }
                    />
                    <div>
                      <div className="font-semibold">Transferir sites</div>
                      <div className="text-xs text-white/50">Libera transferência de sites entre usuários.</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
                    <input
                      type="checkbox"
                      checked={permissions.can_view_orders}
                      onChange={(e) =>
                        setPermissions((prev) => ({
                          ...prev,
                          can_view_orders: e.target.checked,
                        }))
                      }
                    />
                    <div>
                      <div className="font-semibold">Ver compras</div>
                      <div className="text-xs text-white/50">Libera acesso à página de compras.</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
                    <input
                      type="checkbox"
                      checked={permissions.can_manage_suggestions}
                      onChange={(e) =>
                        setPermissions((prev) => ({
                          ...prev,
                          can_manage_suggestions: e.target.checked,
                        }))
                      }
                    />
                    <div>
                      <div className="font-semibold">Gerenciar sugestões</div>
                      <div className="text-xs text-white/50">Libera acesso ao painel admin de sugestões.</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
                    <input
                      type="checkbox"
                      checked={permissions.can_use_custom_domain}
                      onChange={(e) =>
                        setPermissions((prev) => ({
                          ...prev,
                          can_use_custom_domain: e.target.checked,
                        }))
                      }
                    />
                    <div>
                      <div className="font-semibold">Domínio próprio</div>
                      <div className="text-xs text-white/50">Libera função de domínio próprio/custom domain.</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={savePermissions}
                  disabled={saving}
                  className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar permissões"}
                </button>

                <button
                  onClick={() => loadPermissions(selectedUserId)}
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold hover:bg-white/10"
                >
                  Recarregar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}