"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";

type SiteRow = {
  id: string;
  slug: string;
  status: "draft" | "active" | "inactive" | string;
  created_at: string;
  updated_at: string;
};

export default function SitesPage() {
  const supabase = supabaseBrowser();

  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const baseDomain = useMemo(() => process.env.NEXT_PUBLIC_BASE_DOMAIN || "plpainel.com", []);

  async function loadSites() {
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;

    if (!session?.user) {
      window.location.href = "/login";
      return;
    }

    const { data, error } = await supabase
      .from("sites")
      .select("id,slug,status,created_at,updated_at")
      .order("created_at", { ascending: false });

    if (error) console.log(error);
    setSites((data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadSites();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sites;
    return sites.filter((s) => s.slug.toLowerCase().includes(q));
  }, [query, sites]);

  async function onDelete(site: SiteRow) {
    const ok = confirm(
      `Tem certeza que deseja excluir o site ${site.slug}.${baseDomain}?\n\nIsso vai apagar o conteúdo do site e não pode ser desfeito.`
    );
    if (!ok) return;

    setDeletingId(site.id);

    const { error } = await supabase.from("sites").delete().eq("id", site.id);

    setDeletingId(null);

    if (error) {
      alert("Erro ao excluir: " + error.message);
      return;
    }

    await loadSites();
  }

  async function onLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Meus Sites</h1>
          <p className="text-white/60 text-sm mt-1">Gerencie seus sites publicados no subdomínio.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onLogout}
            className="rounded-xl bg-white/10 hover:bg-white/15 transition px-3 py-2 text-sm"
          >
            Sair
          </button>
          <Link
            className="rounded-xl bg-violet-600 hover:bg-violet-500 transition px-4 py-2 font-medium"
            href="/sites/new"
          >
            + Criar Site
          </Link>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <input
          className="w-full rounded-xl bg-white/5 border border-white/10 p-3"
          placeholder="Buscar por slug (ex: tk-marketing)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          onClick={loadSites}
          className="rounded-xl bg-white/10 hover:bg-white/15 transition px-4 py-3 text-sm"
          title="Atualizar"
        >
          Atualizar
        </button>
      </div>

      {loading ? (
        <div className="text-white/70 mt-6">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-white/70 mt-6">
          {query ? "Nenhum site encontrado." : "Você ainda não criou nenhum site."}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((s) => (
            <div key={s.id} className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{s.slug}.{baseDomain}</div>
                  <div className="text-white/60 text-sm mt-1">
                    Status: <span className="text-white/80">{s.status}</span>
                  </div>
                </div>

                <span className="text-xs rounded-full px-2 py-1 bg-white/10 text-white/70">
                  {new Date(s.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  className="rounded-xl bg-white/10 hover:bg-white/15 transition px-3 py-2 text-sm"
                  href={`https://${s.slug}.${baseDomain}`}
                  target="_blank"
                >
                  Abrir
                </a>

                <Link
                  className="rounded-xl bg-white/10 hover:bg-white/15 transition px-3 py-2 text-sm"
                  href={`/sites/${s.id}/edit`}
                >
                  Editar
                </Link>

                <button
                  onClick={() => onDelete(s)}
                  disabled={deletingId === s.id}
                  className="rounded-xl bg-red-500/20 hover:bg-red-500/30 transition px-3 py-2 text-sm text-red-200"
                >
                  {deletingId === s.id ? "Excluindo..." : "Excluir"}
                </button>
              </div>

              <div className="text-white/50 text-xs mt-3">
                Atualizado: {new Date(s.updated_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
