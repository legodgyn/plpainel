"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

type SiteRow = {
  id: string;
  slug: string | null;
  company_name: string | null;
  created_at: string;
  is_public: boolean;
  user_id: string;
  base_domain: string | null;
  domain_mode: string | null;
  custom_domain: string | null;
};

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

function getSiteDisplayDomain(site: SiteRow) {
  if (site.domain_mode === "custom_domain" && site.custom_domain) {
    return site.custom_domain;
  }
  return `${site.slug || "site"}.${site.base_domain || "plpainel.com"}`;
}

function buildPublicUrl(site: SiteRow) {
  if (site.domain_mode === "custom_domain" && site.custom_domain) {
    return `https://${site.custom_domain}`;
  }

  const slug = site.slug || "site";
  if (typeof window === "undefined") return `/s/${slug}`;

  const host = window.location.hostname;
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".local") ||
    host.endsWith(".localhost");
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);

  if (isLocal || isIp) return `/s/${slug}`;
  return `https://${slug}.${site.base_domain || "plpainel.com"}`;
}

export default function SitesPage() {
  const router = useRouter();

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [items, setItems] = useState<SiteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setMsg(null);
    setLoading(true);

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    const user = auth?.user;

    if (authErr || !user) {
      setLoading(false);
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("sites")
      .select("id, slug, company_name, created_at, is_public, user_id, base_domain, domain_mode, custom_domain")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      setMsg(error.message || "Erro ao carregar sites.");
      return;
    }

    setItems((data || []) as SiteRow[]);
  }

  async function removeSite(id: string) {
    const ok = confirm("Tem certeza que deseja excluir esse site?");
    if (!ok) return;

    setMsg(null);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;

    if (!user) {
      router.push("/login");
      return;
    }

    const { error } = await supabase
      .from("sites")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      setMsg(error.message || "Erro ao excluir.");
      return;
    }

    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalSites = items.length;
  const activeSites = items.filter((x) => x.is_public).length;
  const hiddenSites = items.filter((x) => !x.is_public).length;

  const filtered = useMemo(() => {
    let list = [...items];
    const s = q.trim().toLowerCase();

    if (s) {
      list = list.filter((x) =>
        `${x.slug || ""} ${x.company_name || ""} ${x.base_domain || ""} ${x.custom_domain || ""}`
          .toLowerCase()
          .includes(s)
      );
    }

    if (statusFilter === "active") list = list.filter((x) => x.is_public);
    if (statusFilter === "hidden") list = list.filter((x) => !x.is_public);

    if (sortBy === "newest") {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    if (sortBy === "oldest") {
      list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    if (sortBy === "az") {
      list.sort((a, b) =>
        String(a.company_name || a.slug || a.custom_domain || "").localeCompare(
          String(b.company_name || b.slug || b.custom_domain || ""),
          "pt-BR",
          { sensitivity: "base" }
        )
      );
    }
    if (sortBy === "za") {
      list.sort((a, b) =>
        String(b.company_name || b.slug || b.custom_domain || "").localeCompare(
          String(a.company_name || a.slug || a.custom_domain || ""),
          "pt-BR",
          { sensitivity: "base" }
        )
      );
    }

    return list;
  }, [items, q, statusFilter, sortBy]);

  function clearFilters() {
    setQ("");
    setStatusFilter("all");
    setSortBy("newest");
  }

  return (
    <div className="pl-page max-w-7xl space-y-6">
      <div className="pl-page-title">
        <div>
          <h1>Meus Sites</h1>
          <p>Gerencie sites publicados, domínios, SSL, emails e verificações em uma tela só.</p>
        </div>
        <button onClick={() => router.push("/sites/new")} className="pl-btn pl-btn-primary">
          Criar novo site
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="pl-card p-5">
          <div className="text-xs font-black uppercase text-[var(--panel-muted)]">Total de sites</div>
          <div className="mt-2 text-3xl font-black">{totalSites}</div>
        </div>
        <div className="pl-card p-5">
          <div className="text-xs font-black uppercase text-[var(--panel-muted)]">Ativos</div>
          <div className="mt-2 text-3xl font-black text-[var(--panel-green-2)]">{activeSites}</div>
        </div>
        <div className="pl-card p-5">
          <div className="text-xs font-black uppercase text-[var(--panel-muted)]">Ocultos</div>
          <div className="mt-2 text-3xl font-black">{hiddenSites}</div>
        </div>
      </div>

      <div className="pl-card p-4">
        <div className="grid gap-3 md:grid-cols-[1.5fr_.8fr_.8fr_auto]">
          <label>
            <span className="pl-label">Pesquisar</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Pesquisar por slug, nome ou domínio..."
              className="pl-input"
            />
          </label>
          <label>
            <span className="pl-label">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-select"
            >
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="hidden">Ocultos</option>
            </select>
          </label>
          <label>
            <span className="pl-label">Ordenar por</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="pl-select"
            >
              <option value="newest">Mais recentes</option>
              <option value="oldest">Mais antigos</option>
              <option value="az">Nome A-Z</option>
              <option value="za">Nome Z-A</option>
            </select>
          </label>
          <div className="flex items-end">
            <button onClick={clearFilters} className="pl-btn w-full">
              Limpar
            </button>
          </div>
        </div>
        <div className="mt-4 text-xs text-[var(--panel-muted)]">
          {loading ? "Carregando..." : `${filtered.length} site(s) encontrado(s)`}
        </div>
      </div>

      {msg && (
        <div className="rounded-xl border border-[var(--panel-line)] bg-white px-4 py-3 text-sm text-[var(--panel-muted)]">
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="pl-card animate-pulse p-5">
              <div className="h-5 w-3/4 rounded bg-slate-100" />
              <div className="mt-3 h-4 w-1/3 rounded bg-slate-100" />
              <div className="mt-4 h-4 w-2/3 rounded bg-slate-100" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="pl-card p-6 text-[var(--panel-muted)] md:col-span-2 xl:col-span-3">
            Nenhum site encontrado. Clique em <b>Criar Site</b>.
          </div>
        ) : (
          filtered.map((site) => {
            const publicUrl = buildPublicUrl(site);
            const displayDomain = getSiteDisplayDomain(site);

            return (
              <div key={site.id} className="pl-card p-5 transition hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="break-all text-base font-black text-[var(--panel-ink)]">
                      {displayDomain}
                    </div>
                    <div className="mt-1 text-xs text-[var(--panel-muted)]">
                      Criado em: {fmtDate(site.created_at)}
                    </div>
                    {site.company_name && (
                      <div className="mt-3 line-clamp-2 text-sm font-semibold text-[var(--panel-ink)]">
                        {site.company_name}
                      </div>
                    )}
                  </div>
                  <span className={site.is_public ? "pl-badge pl-badge-ok" : "pl-badge"}>
                    {site.is_public ? "Ativo" : "Oculto"}
                  </span>
                </div>

                <div className="mt-3 break-all text-xs text-[var(--panel-muted)]">
                  {publicUrl}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <a href={publicUrl} target="_blank" rel="noreferrer" className="pl-btn px-3 py-2 text-xs">
                    Abrir
                  </a>
                  <button
                    onClick={() => router.push(`/sites/${site.id}/edit`)}
                    className="pl-btn px-3 py-2 text-xs"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => router.push("/sites/template-simples")}
                    className="pl-btn px-3 py-2 text-xs"
                  >
                    Editar Layout
                  </button>
                  <button onClick={() => removeSite(site.id)} className="pl-btn pl-btn-danger px-3 py-2 text-xs">
                    Excluir
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
