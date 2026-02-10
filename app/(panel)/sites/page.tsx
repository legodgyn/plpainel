"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

type SiteRow = {
  id: string;
  slug: string;
  company_name: string | null;
  created_at: string;
  is_public: boolean;
};

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

// Detecta DEV/local e monta a URL pública sem depender de env.
function buildPublicUrl(slug: string) {
  if (typeof window === "undefined") return `/s/${slug}`; // fallback SSR (não deve usar aqui)

  const host = window.location.hostname;

  // Dev / local
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".local") ||
    host.endsWith(".localhost");

  // Se você acessar via IP (tipo 187.77.33.45), também mantém /s/slug
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);

  if (isLocal || isIp) return `/s/${slug}`;

  // Produção
  return `https://${slug}.plpainel.com`;
}

export default function SitesPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<SiteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setMsg(null);
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setLoading(false);
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("sites")
      .select("id, slug, company_name, created_at, is_public")
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

    const { error } = await supabase.from("sites").delete().eq("id", id);
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

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((x) =>
      `${x.slug} ${x.company_name || ""}`.toLowerCase().includes(s)
    );
  }, [items, q]);

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-white">Meus Sites</h1>

        <button
          onClick={() => router.push("/sites/new")}
          className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
        >
          + Criar Site
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex w-full items-center gap-2 md:max-w-md">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar por slug ou nome..."
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none focus:border-violet-400"
          />
        </div>

        <div className="text-xs text-white/50">
          {loading ? "Carregando..." : `${filtered.length} site(s)`}
        </div>
      </div>

      {msg && (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80">
          {msg}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
            Carregando sites...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
            Nenhum site encontrado. Clique em <b>“Criar Site”</b>.
          </div>
        ) : (
          filtered.map((site) => {
            const publicUrl = buildPublicUrl(site.slug);

            return (
              <div
                key={site.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {/* Só para exibir, não precisa navegar por aqui */}
                    <div className="text-violet-300 font-semibold break-all">
                      {site.slug}.plpainel.com
                    </div>

                    <div className="mt-1 text-xs text-white/50">
                      Criado em: {fmtDate(site.created_at)}
                    </div>

                    {site.company_name && (
                      <div className="mt-2 text-sm text-white/80">
                        {site.company_name}
                      </div>
                    )}
                  </div>

                  <span
                    className={`rounded-full px-2 py-1 text-[11px] border ${
                      site.is_public
                        ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/20"
                        : "bg-white/10 text-white/70 border-white/10"
                    }`}
                  >
                    {site.is_public ? "Ativo" : "Oculto"}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {/* ✅ Aqui é o que você queria: abre no domínio certo */}
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/80 hover:bg-black/30"
                  >
                    Abrir
                  </a>

                  <button
                    onClick={() => router.push(`/sites/${site.id}/edit`)}
                    className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/80 hover:bg-black/30"
                  >
                    Editar
                  </button>

                  <button
                    onClick={() => removeSite(site.id)}
                    className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/15"
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
