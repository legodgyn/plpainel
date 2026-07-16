"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

type DomainStat = {
  domain: string;
  kind: "platform" | "custom";
  total: number;
  active: number;
  hidden: number;
  last_created_at: string | null;
  last_site: {
    id: string;
    slug: string | null;
    company_name: string | null;
    url: string;
  } | null;
};

type Totals = {
  sites: number;
  domains: number;
  platform_sites: number;
  custom_sites: number;
  active: number;
  hidden: number;
};

function fmtDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

function kindLabel(kind: DomainStat["kind"]) {
  return kind === "custom" ? "Dominio proprio" : "Rotacao";
}

export default function DomainStatsPage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [domains, setDomains] = useState<DomainStat[]>([]);
  const [totals, setTotals] = useState<Totals>({
    sites: 0,
    domains: 0,
    platform_sites: 0,
    custom_sites: 0,
    active: 0,
    hidden: 0,
  });
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [sortBy, setSortBy] = useState("total_desc");

  async function load() {
    setLoading(true);
    setMsg(null);

    const { data: auth } = await supabase.auth.getSession();
    const token = auth?.session?.access_token;

    if (!token) {
      setMsg("Voce precisa estar logado.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/admin/domain-stats", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok) {
      setMsg(data?.error || "Erro ao carregar estatisticas.");
      setLoading(false);
      return;
    }

    setDomains(data.domains || []);
    setTotals(
      data.totals || {
        sites: 0,
        domains: 0,
        platform_sites: 0,
        custom_sites: 0,
        active: 0,
        hidden: 0,
      }
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = domains.filter((item) => {
      if (kindFilter !== "all" && item.kind !== kindFilter) return false;
      if (!term) return true;

      const haystack = [
        item.domain,
        kindLabel(item.kind),
        item.last_site?.slug || "",
        item.last_site?.company_name || "",
        item.last_site?.url || "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });

    list.sort((a, b) => {
      if (sortBy === "az") {
        return a.domain.localeCompare(b.domain, "pt-BR", { sensitivity: "base" });
      }

      if (sortBy === "recent") {
        return (
          new Date(b.last_created_at || 0).getTime() -
          new Date(a.last_created_at || 0).getTime()
        );
      }

      if (sortBy === "active_desc") return b.active - a.active;
      return b.total - a.total;
    });

    return list;
  }, [domains, kindFilter, search, sortBy]);

  function clearFilters() {
    setSearch("");
    setKindFilter("all");
    setSortBy("total_desc");
  }

  return (
    <div className="pl-page max-w-7xl space-y-6">
      <div className="pl-page-title">
        <div>
          <h1>Sites por Dominio</h1>
          <p>Acompanhe quantos sites foram criados em cada dominio da plataforma.</p>
        </div>
        <button onClick={load} className="pl-btn pl-btn-primary">
          Atualizar
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="pl-card p-5">
          <div className="text-xs font-black uppercase text-[var(--panel-muted)]">Sites criados</div>
          <div className="mt-2 text-3xl font-black">{totals.sites}</div>
        </div>
        <div className="pl-card p-5">
          <div className="text-xs font-black uppercase text-[var(--panel-muted)]">Dominios usados</div>
          <div className="mt-2 text-3xl font-black">{totals.domains}</div>
        </div>
        <div className="pl-card p-5">
          <div className="text-xs font-black uppercase text-[var(--panel-muted)]">Na rotacao</div>
          <div className="mt-2 text-3xl font-black text-[var(--panel-green-2)]">
            {totals.platform_sites}
          </div>
        </div>
        <div className="pl-card p-5">
          <div className="text-xs font-black uppercase text-[var(--panel-muted)]">Dominios proprios</div>
          <div className="mt-2 text-3xl font-black">{totals.custom_sites}</div>
        </div>
      </div>

      <div className="pl-card p-4">
        <div className="grid gap-3 md:grid-cols-[1.5fr_.8fr_.8fr_auto]">
          <label>
            <span className="pl-label">Pesquisar</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar dominio, slug ou empresa..."
              className="pl-input"
            />
          </label>
          <label>
            <span className="pl-label">Tipo</span>
            <select
              value={kindFilter}
              onChange={(event) => setKindFilter(event.target.value)}
              className="pl-select"
            >
              <option value="all">Todos</option>
              <option value="platform">Rotacao</option>
              <option value="custom">Dominio proprio</option>
            </select>
          </label>
          <label>
            <span className="pl-label">Ordenar por</span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="pl-select"
            >
              <option value="total_desc">Mais sites</option>
              <option value="active_desc">Mais ativos</option>
              <option value="recent">Mais recentes</option>
              <option value="az">Dominio A-Z</option>
            </select>
          </label>
          <div className="flex items-end">
            <button onClick={clearFilters} className="pl-btn w-full">
              Limpar
            </button>
          </div>
        </div>
        <div className="mt-4 text-xs text-[var(--panel-muted)]">
          {loading ? "Carregando..." : `${filtered.length} dominio(s) encontrado(s)`}
        </div>
      </div>

      {msg ? (
        <div className="rounded-xl border border-[var(--panel-line)] bg-white px-4 py-3 text-sm text-[var(--panel-muted)]">
          {msg}
        </div>
      ) : null}

      <div className="pl-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-[var(--panel-line)] bg-slate-50 text-xs uppercase text-[var(--panel-muted)]">
              <tr>
                <th className="px-4 py-3">Dominio</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Ativos</th>
                <th className="px-4 py-3">Ocultos</th>
                <th className="px-4 py-3">Ultimo site</th>
                <th className="px-4 py-3">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-[var(--panel-muted)]" colSpan={7}>
                    Carregando estatisticas...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-[var(--panel-muted)]" colSpan={7}>
                    Nenhum dominio encontrado.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr
                    key={`${item.kind}:${item.domain}`}
                    className="border-b border-[var(--panel-line)] last:border-0"
                  >
                    <td className="px-4 py-4">
                      <div className="break-all font-black text-[var(--panel-ink)]">{item.domain}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={item.kind === "custom" ? "pl-badge pl-badge-warn" : "pl-badge pl-badge-ok"}>
                        {kindLabel(item.kind)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-lg font-black">{item.total}</td>
                    <td className="px-4 py-4 font-black text-[var(--panel-green-2)]">{item.active}</td>
                    <td className="px-4 py-4">{item.hidden}</td>
                    <td className="px-4 py-4">
                      {item.last_site ? (
                        <a
                          className="break-all font-semibold text-[var(--panel-green-2)] hover:underline"
                          href={item.last_site.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {item.last_site.company_name || item.last_site.slug || item.last_site.url}
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-4 text-[var(--panel-muted)]">{fmtDate(item.last_created_at)}</td>
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
