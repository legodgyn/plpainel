 "use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

type UserOption = {
  user_id: string;
  email: string | null;
  name: string | null;
  whatsapp: string | null;
  total_spent_label?: string | null;
  token_balance?: number | null;
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

function getInitials(name?: string | null, email?: string | null) {
  const base = String(name || email || "?").trim();
  if (!base) return "?";

  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }

  return base.slice(0, 2).toUpperCase();
}

function getTokenBadgeClass(balance: number) {
  if (balance <= 0) {
    return "border-red-500/20 bg-red-500/10 text-red-200";
  }

  if (balance < 10) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-200";
  }

  return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200";
}

export default function TransferirSitesAdminPage() {
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingSites, setLoadingSites] = useState(false);
  const [saving, setSaving] = useState(false);

  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<"error" | "success">("success");

  const [users, setUsers] = useState<UserOption[]>([]);
  const [fromSearch, setFromSearch] = useState("");
  const [toSearch, setToSearch] = useState("");
  const [siteSearch, setSiteSearch] = useState("");

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
      setMsgType("error");
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
      setMsgType("error");
      setMsg(j?.error || "Erro ao carregar usuários.");
      setLoadingUsers(false);
      return;
    }

    const mapped = (j.users || []).map((u: any) => ({
      user_id: u.user_id,
      email: u.email || null,
      name: u.name || null,
      whatsapp: u.whatsapp || null,
      total_spent_label: u.total_spent_label || null,
      token_balance: Number(u.token_balance || 0),
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
      setMsgType("error");
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
    let list = users;

    if (s) {
      list = list.filter((u) =>
        `${u.name || ""} ${u.email || ""} ${u.whatsapp || ""}`
          .toLowerCase()
          .includes(s)
      );
    }

    return [...list]
      .sort((a, b) =>
        String(a.email || a.name || "").localeCompare(
          String(b.email || b.name || ""),
          "pt-BR",
          { sensitivity: "base" }
        )
      )
      .slice(0, 30);
  }, [users, fromSearch]);

  const toFiltered = useMemo(() => {
    const s = toSearch.trim().toLowerCase();
    let list = users;

    if (s) {
      list = list.filter((u) =>
        `${u.name || ""} ${u.email || ""} ${u.whatsapp || ""}`
          .toLowerCase()
          .includes(s)
      );
    }

    return [...list]
      .sort((a, b) =>
        String(a.email || a.name || "").localeCompare(
          String(b.email || b.name || ""),
          "pt-BR",
          { sensitivity: "base" }
        )
      )
      .slice(0, 30);
  }, [users, toSearch]);

  const filteredSites = useMemo(() => {
    const s = siteSearch.trim().toLowerCase();
    if (!s) return sites;

    return sites.filter((site) =>
      `${site.slug} ${site.company_name || ""}`.toLowerCase().includes(s)
    );
  }, [sites, siteSearch]);

  const fromUser = users.find((u) => u.user_id === fromUserId) || null;
  const toUser = users.find((u) => u.user_id === toUserId) || null;

  const totalSites = sites.length;
  const activeSites = sites.filter((x) => x.is_public).length;
  const hiddenSites = sites.filter((x) => !x.is_public).length;

  const allFilteredSelected =
    filteredSites.length > 0 &&
    filteredSites.every((site) => selectedSiteIds.includes(site.id));

  function toggleSite(siteId: string) {
    setSelectedSiteIds((prev) =>
      prev.includes(siteId)
        ? prev.filter((x) => x !== siteId)
        : [...prev, siteId]
    );
  }

  function toggleAllFilteredSites() {
    if (allFilteredSelected) {
      setSelectedSiteIds((prev) =>
        prev.filter((id) => !filteredSites.some((site) => site.id === id))
      );
      return;
    }

    setSelectedSiteIds((prev) => {
      const next = new Set(prev);
      filteredSites.forEach((site) => next.add(site.id));
      return Array.from(next);
    });
  }

  async function handleTransfer() {
    setMsg(null);

    if (!fromUserId) {
      setMsgType("error");
      setMsg("Selecione o usuário de origem.");
      return;
    }

    if (!toUserId) {
      setMsgType("error");
      setMsg("Selecione o usuário de destino.");
      return;
    }

    if (fromUserId === toUserId) {
      setMsgType("error");
      setMsg("Origem e destino não podem ser iguais.");
      return;
    }

    if (!selectedSiteIds.length) {
      setMsgType("error");
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
        setMsgType("error");
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
        setMsgType("error");
        setMsg(j?.error || "Erro ao transferir sites.");
        setSaving(false);
        return;
      }

      setMsgType("success");
      setMsg(
        `Transferência concluída com sucesso! ${j.transferred} site(s) transferido(s).`
      );

      setSelectedSiteIds([]);
      await loadSitesByUser(fromUserId);
    } catch (e: any) {
      setMsgType("error");
      setMsg(e?.message || "Erro ao transferir sites.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 text-white">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Transferir Sites</h1>
            <p className="mt-1 text-sm text-white/60">
              Selecione um usuário de origem, escolha os sites e transfira para outro usuário.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
            <div className="text-white/50">Selecionados</div>
            <div className="text-lg font-bold">{selectedSiteIds.length}</div>
          </div>
        </div>
      </div>

      {msg ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            msgType === "success"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/20 bg-red-500/10 text-red-200"
          }`}
        >
          {msg}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold">Usuário de origem</div>
          <input
            value={fromSearch}
            onChange={(e) => setFromSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou WhatsApp"
            className="mt-3 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400"
          />

          <div className="mt-3 max-h-80 overflow-auto rounded-xl border border-white/10">
            {loadingUsers ? (
              <div className="p-4 text-sm text-white/60">Carregando usuários...</div>
            ) : fromFiltered.length === 0 ? (
              <div className="p-4 text-sm text-white/60">Nenhum usuário encontrado.</div>
            ) : (
              fromFiltered.map((u) => {
                const active = fromUserId === u.user_id;
                const tokenBalance = Number(u.token_balance || 0);

                return (
                  <button
                    key={u.user_id}
                    onClick={() => setFromUserId(u.user_id)}
                    className={`flex w-full items-start gap-3 border-b border-white/5 px-4 py-3 text-left last:border-b-0 ${
                      active ? "bg-violet-500/15" : "hover:bg-white/5"
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-xs font-bold text-violet-200">
                      {getInitials(u.name, u.email)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-white/90">
                        {u.email || "—"}
                      </div>
                      <div className="mt-0.5 text-xs text-white/50">
                        {u.name || "Sem nome"} {u.whatsapp ? `• ${u.whatsapp}` : ""}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getTokenBadgeClass(
                            tokenBalance
                          )}`}
                        >
                          Tokens: {tokenBalance}
                        </span>

                        {u.total_spent_label ? (
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/70">
                            Gasto: {u.total_spent_label}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {fromUser ? (
            <div className="mt-4 rounded-xl border border-violet-500/20 bg-violet-500/10 p-4 text-sm">
              <div className="text-white/60">Origem selecionada</div>
              <div className="mt-1 font-semibold">{fromUser.email}</div>
              <div className="mt-1 text-xs text-white/60">
                {fromUser.name || "Sem nome"} {fromUser.whatsapp ? `• ${fromUser.whatsapp}` : ""}
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold">Usuário de destino</div>
          <input
            value={toSearch}
            onChange={(e) => setToSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou WhatsApp"
            className="mt-3 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
          />

          <div className="mt-3 max-h-80 overflow-auto rounded-xl border border-white/10">
            {loadingUsers ? (
              <div className="p-4 text-sm text-white/60">Carregando usuários...</div>
            ) : toFiltered.length === 0 ? (
              <div className="p-4 text-sm text-white/60">Nenhum usuário encontrado.</div>
            ) : (
              toFiltered.map((u) => {
                const active = toUserId === u.user_id;
                const tokenBalance = Number(u.token_balance || 0);

                return (
                  <button
                    key={u.user_id}
                    onClick={() => setToUserId(u.user_id)}
                    className={`flex w-full items-start gap-3 border-b border-white/5 px-4 py-3 text-left last:border-b-0 ${
                      active ? "bg-emerald-500/15" : "hover:bg-white/5"
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-200">
                      {getInitials(u.name, u.email)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-white/90">
                        {u.email || "—"}
                      </div>
                      <div className="mt-0.5 text-xs text-white/50">
                        {u.name || "Sem nome"} {u.whatsapp ? `• ${u.whatsapp}` : ""}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getTokenBadgeClass(
                            tokenBalance
                          )}`}
                        >
                          Tokens: {tokenBalance}
                        </span>

                        {u.total_spent_label ? (
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/70">
                            Gasto: {u.total_spent_label}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {toUser ? (
            <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm">
              <div className="text-white/60">Destino selecionado</div>
              <div className="mt-1 font-semibold">{toUser.email}</div>
              <div className="mt-1 text-xs text-white/60">
                {toUser.name || "Sem nome"} {toUser.whatsapp ? `• ${toUser.whatsapp}` : ""}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-xs text-white/60">Total de sites</div>
          <div className="mt-2 text-3xl font-bold text-white">{totalSites}</div>
        </div>

        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/10 p-5">
          <div className="text-xs text-emerald-200/80">Ativos</div>
          <div className="mt-2 text-3xl font-bold text-emerald-200">{activeSites}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-xs text-white/60">Ocultos</div>
          <div className="mt-2 text-3xl font-bold text-white">{hiddenSites}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm font-semibold">Sites do usuário de origem</div>
            <div className="mt-1 text-xs text-white/50">
              Selecione um ou mais sites para transferir.
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={siteSearch}
              onChange={(e) => setSiteSearch(e.target.value)}
              placeholder="Buscar por slug ou empresa"
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400 sm:w-[280px]"
            />

            {filteredSites.length > 0 ? (
              <button
                onClick={toggleAllFilteredSites}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10"
              >
                {allFilteredSelected ? "Desmarcar filtrados" : "Selecionar filtrados"}
              </button>
            ) : null}
          </div>
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
              ) : filteredSites.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-white/60">
                    Nenhum site encontrado para esse usuário.
                  </td>
                </tr>
              ) : (
                filteredSites.map((site) => (
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

        <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1 text-sm text-white/60">
            <div>{selectedSiteIds.length} site(s) selecionado(s)</div>
            {fromUser && toUser ? (
              <div className="text-xs text-white/45">
                Transferindo de <span className="text-white/70">{fromUser.email}</span> para{" "}
                <span className="text-white/70">{toUser.email}</span>
              </div>
            ) : null}
          </div>

          <button
            onClick={handleTransfer}
            disabled={saving || !selectedSiteIds.length || !fromUserId || !toUserId}
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Transferindo..." : "Transferir sites"}
          </button>
        </div>
      </div>
    </div>
  );
}
