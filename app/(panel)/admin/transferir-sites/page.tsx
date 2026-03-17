"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

type UserOption = {
  user_id: string;
  email: string | null;
  name: string | null;
  whatsapp: string | null;
};

type SiteRow = {
  id: string;
  slug: string;
  company_name: string | null;
  created_at: string | null;
  is_public: boolean;
  user_id: string;
};

function fmt(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

export default function TransferirSitesAdminPage() {
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingSites, setLoadingSites] = useState(false);
  const [saving, setSaving] = useState(false);

  const [msg, setMsg] = useState<string | null>(null);

  const [users, setUsers] = useState<UserOption[]>([]);
  const [fromSearch, setFromSearch] = useState("");
  const [toSearch, setToSearch] = useState("");
  const [fromUserId, setFromUserId] = useState("");
  const [toUserId, setToUserId] = useState("");

  const [sites, setSites] = useState<SiteRow[]>([]);
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([]);

  async function loadUsers() {
    setLoadingUsers(true);
    setMsg(null);

    const { data: auth } = await supabase.auth.getSession();
    const token = auth?.session?.access_token;

    if (!token) {
      setMsg("Você precisa estar logado.");
      setLoadingUsers(false);
      return;
    }

    const r = await fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.ok) {
      setMsg(j?.error || "Erro ao carregar usuários.");
      setLoadingUsers(false);
      return;
    }

    const mapped = (j.users || []).map((u: any) => ({
      user_id: u.user_id,
      email: u.email || null,
      name: u.name || null,
      whatsapp: u.whatsapp || null,
    }));

    setUsers(mapped);
    setLoadingUsers(false);
  }

  async function loadSitesByUser(userId: string) {
    if (!userId) {
      setSites([]);
      setSelectedSiteIds([]);
      return;
    }

    setLoadingSites(true);
    setMsg(null);

    const { data, error } = await supabase
      .from("sites")
      .select("id, slug, company_name, created_at, is_public, user_id")
      .eq("user_id", userId)
      .order("slug", { ascending: true });

    if (error) {
      setMsg(error.message || "Erro ao carregar sites.");
      setSites([]);
      setSelectedSiteIds([]);
      setLoadingSites(false);
      return;
    }

    setSites((data || []) as SiteRow[]);
    setSelectedSiteIds([]);
    setLoadingSites(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    loadSitesByUser(fromUserId);
  }, [fromUserId]);

  const fromFiltered = useMemo(() => {
    const s = fromSearch.trim().toLowerCase();
    if (!s) return users.slice(0, 20);
    return users
      .filter((u) =>
        `${u.name || ""} ${u.email || ""} ${u.whatsapp || ""}`
          .toLowerCase()
          .includes(s)
      )
      .slice(0, 20);
  }, [users, fromSearch]);

  const toFiltered = useMemo(() => {
    const s = toSearch.trim().toLowerCase();
    if (!s) return users.slice(0, 20);
    return users
      .filter((u) =>
        `${u.name || ""} ${u.email || ""} ${u.whatsapp || ""}`
          .toLowerCase()
          .includes(s)
      )
      .slice(0, 20);
  }, [users, toSearch]);

  const fromUser = users.find((u) => u.user_id === fromUserId) || null;
  const toUser = users.find((u) => u.user_id === toUserId) || null;

  function toggleSite(siteId: string) {
    setSelectedSiteIds((prev) =>
      prev.includes(siteId)
        ? prev.filter((x) => x !== siteId)
        : [...prev, siteId]
    );
  }

  function toggleAllSites() {
    if (selectedSiteIds.length === sites.length) {
      setSelectedSiteIds([]);
      return;
    }
    setSelectedSiteIds(sites.map((s) => s.id));
  }

  async function handleTransfer() {
    setMsg(null);

    if (!fromUserId) {
      setMsg("Selecione o usuário de origem.");
      return;
    }

    if (!toUserId) {
      setMsg("Selecione o usuário de destino.");
      return;
    }

    if (fromUserId === toUserId) {
      setMsg("Origem e destino não podem ser iguais.");
      return;
    }

    if (!selectedSiteIds.length) {
      setMsg("Selecione pelo menos 1 site.");
      return;
    }

    const ok = confirm(
      `Tem certeza que deseja transferir ${selectedSiteIds.length} site(s)?`
    );
    if (!ok) return;

    setSaving(true);

    try {
      const { data: auth } = await supabase.auth.getSession();
      const token = auth?.session?.access_token;

      if (!token) {
        setMsg("Você precisa estar logado.");
        setSaving(false);
        return;
      }

      const r = await fetch("/api/admin/transfer-site", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          from_user_id: fromUserId,
          to_user_id: toUserId,
          site_ids: selectedSiteIds,
        }),
      });

      const j = await r.json().catch(() => ({}));

      if (!r.ok || !j?.ok) {
        setMsg(j?.error || "Erro ao transferir sites.");
        setSaving(false);
        return;
      }

      setMsg(`Transferência concluída com sucesso! ${j.transferred} site(s) transferido(s).`);
      await loadSitesByUser(fromUserId);
    } catch (e: any) {
      setMsg(e?.message || "Erro ao transferir sites.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 text-white">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h1 className="text-xl font-semibold">Transferir Sites</h1>
        <p className="mt-1 text-sm text-white/60">
          Selecione um usuário de origem, escolha os sites e transfira para outro usuário.
        </p>
      </div>

      {msg ? (
        <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80">
          {msg}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold">Usuário de origem</div>
          <input
            value={fromSearch}
            onChange={(e) => setFromSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou WhatsApp"
            className="mt-3 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-violet-400"
          />

          <div className="mt-3 max-h-72 overflow-auto rounded-xl border border-white/10">
            {loadingUsers ? (
              <div className="p-4 text-sm text-white/60">Carregando usuários...</div>
            ) : fromFiltered.length === 0 ? (
              <div className="p-4 text-sm text-white/60">Nenhum usuário encontrado.</div>
            ) : (
              fromFiltered.map((u) => {
                const active = fromUserId === u.user_id;
                return (
                  <button
                    key={u.user_id}
                    onClick={() => setFromUserId(u.user_id)}
                    className={`block w-full border-b border-white/5 px-4 py-3 text-left last:border-b-0 ${
                      active ? "bg-violet-500/15" : "hover:bg-white/5"
                    }`}
                  >
                    <div className="font-semibold text-white/90">{u.email || "—"}</div>
                    <div className="text-xs text-white/50">
                      {u.name || "Sem nome"} {u.whatsapp ? `• ${u.whatsapp}` : ""}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {fromUser ? (
            <div className="mt-4 rounded-xl border border-violet-500/20 bg-violet-500/10 p-3 text-sm">
              Origem selecionada: <span className="font-semibold">{fromUser.email}</span>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold">Usuário de destino</div>
          <input
            value={toSearch}
            onChange={(e) => setToSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou WhatsApp"
            className="mt-3 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
          />

          <div className="mt-3 max-h-72 overflow-auto rounded-xl border border-white/10">
            {loadingUsers ? (
              <div className="p-4 text-sm text-white/60">Carregando usuários...</div>
            ) : toFiltered.length === 0 ? (
              <div className="p-4 text-sm text-white/60">Nenhum usuário encontrado.</div>
            ) : (
              toFiltered.map((u) => {
                const active = toUserId === u.user_id;
                return (
                  <button
                    key={u.user_id}
                    onClick={() => setToUserId(u.user_id)}
                    className={`block w-full border-b border-white/5 px-4 py-3 text-left last:border-b-0 ${
                      active ? "bg-emerald-500/15" : "hover:bg-white/5"
                    }`}
                  >
                    <div className="font-semibold text-white/90">{u.email || "—"}</div>
                    <div className="text-xs text-white/50">
                      {u.name || "Sem nome"} {u.whatsapp ? `• ${u.whatsapp}` : ""}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {toUser ? (
            <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm">
              Destino selecionado: <span className="font-semibold">{toUser.email}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">Sites do usuário de origem</div>
            <div className="mt-1 text-xs text-white/50">
              Selecione um ou mais sites para transferir.
            </div>
          </div>

          {sites.length > 0 ? (
            <button
              onClick={toggleAllSites}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
            >
              {selectedSiteIds.length === sites.length ? "Desmarcar todos" : "Selecionar todos"}
            </button>
          ) : null}
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-white/70">
              <tr className="border-b border-white/10">
                <th className="py-3 text-left font-medium">Selecionar</th>
                <th className="py-3 text-left font-medium">Slug</th>
                <th className="py-3 text-left font-medium">Empresa</th>
                <th className="py-3 text-left font-medium">Data</th>
                <th className="py-3 text-left font-medium">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {loadingSites ? (
                <tr>
                  <td colSpan={5} className="py-6 text-white/60">
                    Carregando sites...
                  </td>
                </tr>
              ) : sites.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-white/60">
                    Nenhum site encontrado para esse usuário.
                  </td>
                </tr>
              ) : (
                sites.map((site) => (
                  <tr key={site.id} className="hover:bg-white/5">
                    <td className="py-3">
                      <input
                        type="checkbox"
                        checked={selectedSiteIds.includes(site.id)}
                        onChange={() => toggleSite(site.id)}
                        className="h-4 w-4"
                      />
                    </td>

                    <td className="py-3 font-semibold text-violet-300">
                      {site.slug}
                    </td>

                    <td className="py-3 text-white/80">
                      {site.company_name || "—"}
                    </td>

                    <td className="py-3 text-white/60">{fmt(site.created_at)}</td>

                    <td className="py-3">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs ${
                          site.is_public
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                            : "border-white/10 bg-white/10 text-white/70"
                        }`}
                      >
                        {site.is_public ? "Ativo" : "Oculto"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-white/60">
            {selectedSiteIds.length} site(s) selecionado(s)
          </div>

          <button
            onClick={handleTransfer}
            disabled={saving || !selectedSiteIds.length || !fromUserId || !toUserId}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Transferindo..." : "Transferir sites"}
          </button>
        </div>
      </div>
    </div>
  );
}