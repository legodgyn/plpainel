"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

type SiteRow = {
  id: string;
  slug: string;
  company_name: string | null;
  created_at: string;
  is_public: boolean;
  user_id: string;
  base_domain: string | null;
};

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

function buildPublicUrl(slug: string, baseDomain?: string | null) {
  if (typeof window === "undefined") return `/s/${slug}`;

  const host = window.location.hostname;

  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".local") ||
    host.endsWith(".localhost");

  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);

  if (isLocal || isIp) return `/s/${slug}`;

  return `https://${slug}.${baseDomain || "plpainel.com"}`;
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
      .select("id, slug, company_name, created_at, is_public, user_id, base_domain")
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
        `${x.slug} ${x.company_name || ""} ${x.base_domain || ""}`
          .toLowerCase()
          .includes(s)
      );
    }

    if (statusFilter === "active") {
      list = list.filter((x) => x.is_public);
    }

    if (statusFilter === "hidden") {
      list = list.filter((x) => !x.is_public);
    }

    if (sortBy === "newest") {
      list.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    if (sortBy === "oldest") {
      list.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }

    if (sortBy === "az") {
      list.sort((a, b) =>
        String(a.company_name || a.slug).localeCompare(
          String(b.company_name || b.slug),
          "pt-BR",
          { sensitivity: "base" }
        )
      );
    }

    if (sortBy === "za") {
      list.sort((a, b) =>
        String(b.company_name || b.slug).localeCompare(
          String(a.company_name || a.slug),
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
    <div className="max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Meus Sites</h1>
          <p className="mt-1 text-sm text-white/60">
            Gerencie, filtre e acompanhe todos os seus sites em um só lugar.
          </p>
        </div>

        <button
          onClick={() => router.push("/sites/new")}
          className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
        >
          + Criar Site
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-xs text-white/60">Total de sites</div>
          <div className="mt-2 text-3xl font-bold text-white">{totalSites}</div>
        </div>

        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/10 p-5">
          <div className="text-xs text-emerald-200/80">Ativos</div>
          <div className="mt-2 text-3xl font-bold text-emerald-200">
            {activeSites}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-xs text-white/60">Ocultos</div>
          <div className="mt-2 text-3xl font-bold text-white">{hiddenSites}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="grid gap-3 md:grid-cols-[1.5fr_.8fr_.8fr_auto]">
          <div>
            <label className="mb-1 block text-xs text-white/50">Pesquisar</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Pesquisar por slug, nome ou domínio..."
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-violet-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-white/50">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-violet-400"
            >
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="hidden">Ocultos</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-white/50">Ordenar por</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-violet-400"
            >
              <option value="newest">Mais recentes</option>
              <option value="oldest">Mais antigos</option>
              <option value="az">Nome A-Z</option>
              <option value="za">Nome Z-A</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10"
            >
              Limpar
            </button>
          </div>
        </div>

        <div className="mt-4 text-xs text-white/50">
          {loading ? "Carregando..." : `${filtered.length} site(s) encontrado(s)`}
        </div>
      </div>

      {msg && (
        <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80">
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 animate-pulse"
              >
                <div className="h-5 w-3/4 rounded bg-white/10" />
                <div className="mt-3 h-4 w-1/3 rounded bg-white/10" />
                <div className="mt-4 h-4 w-2/3 rounded bg-white/10" />
                <div className="mt-2 h-4 w-1/2 rounded bg-white/10" />
                <div className="mt-5 flex gap-2">
                  <div className="h-9 w-16 rounded-lg bg-white/10" />
                  <div className="h-9 w-16 rounded-lg bg-white/10" />
                  <div className="h-9 w-16 rounded-lg bg-white/10" />
                </div>
              </div>
            ))}
          </>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70 md:col-span-2 xl:col-span-3">
            Nenhum site encontrado. Clique em <b>“Criar Site”</b>.
          </div>
        ) : (
          filtered.map((site) => {
            const publicUrl = buildPublicUrl(site.slug, site.base_domain);

            return (
              <div
                key={site.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm transition hover:border-violet-400/20 hover:bg-white/[0.06]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="break-all text-base font-semibold text-violet-300">
                      {site.slug}.{site.base_domain || "plpainel.com"}
                    </div>

                    <div className="mt-1 text-xs text-white/50">
                      Criado em: {fmtDate(site.created_at)}
                    </div>

                    {site.company_name && (
                      <div className="mt-3 line-clamp-2 text-sm font-medium text-white/85">
                        {site.company_name}
                      </div>
                    )}
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] border ${
                      site.is_public
                        ? "border-emerald-500/20 bg-emerald-500/15 text-emerald-200"
                        : "border-white/10 bg-white/10 text-white/70"
                    }`}
                  >
                    {site.is_public ? "Ativo" : "Oculto"}
                  </span>
                </div>

                <div className="mt-3 text-xs text-white/45 break-all">
                  {publicUrl}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-black/30"
                  >
                    Abrir
                  </a>

                  <button
                    onClick={() => router.push(`/sites/${site.id}/edit`)}
                    className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-black/30"
                  >
                    Editar
                  </button>

                  <button
                    onClick={() => removeSite(site.id)}
                    className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/15"
                  >
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
