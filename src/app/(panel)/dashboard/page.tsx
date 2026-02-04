import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

type SiteRow = {
  id: string;
  slug: string;
  domain?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  project_name?: string | null;
};

function fmtDateBR(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
}

export default async function DashboardPage() {
  const supabase = supabaseServer();

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;

  // tokens
  const { data: profile } = await supabase
    .from("profiles")
    .select("tokens")
    .eq("id", userId)
    .maybeSingle();

  const tokens = Number(profile?.tokens ?? 0);

  // sites
  const { data: sites } = await supabase
    .from("sites")
    .select("id,slug,domain,status,created_at,updated_at,project_name")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const rows = (sites ?? []) as SiteRow[];

  return (
    <div>
      <h1 className="text-3xl font-semibold">
        Bem-vindo, <span className="text-white/80">{auth?.user?.email}</span>!
      </h1>
      <p className="text-white/60 mt-1">Gerencie seus sites e tokens de forma simples e eficiente.</p>

      <div className="mt-6 grid grid-cols-12 gap-5">
        {/* Tokens */}
        <div className="col-span-12 md:col-span-5 rounded-2xl border border-white/10 bg-gradient-to-br from-violet-600/80 to-indigo-600/40 p-6 shadow-[0_25px_60px_rgba(124,58,237,.15)]">
          <div className="flex items-center justify-between">
            <div className="text-white/90 font-semibold">Tokens Disponíveis</div>
            <Link
              href="/tokens"
              className="rounded-xl bg-black/25 hover:bg-black/35 transition px-3 py-2 text-sm font-semibold"
            >
              Comprar Tokens
            </Link>
          </div>

          <div className="mt-4 text-6xl font-bold tracking-tight">{tokens}</div>

          <div className="mt-4 h-2 rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full rounded-full bg-white/70"
              style={{ width: `${Math.min(100, tokens * 8)}%` }}
            />
          </div>

          <div className="mt-2 text-white/70 text-sm">Tokens necessários para criar sites</div>
        </div>

        {/* Criar novo site */}
        <div className="col-span-12 md:col-span-5 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="text-xl font-semibold">Criar Novo Site</div>
          <div className="text-white/60 mt-1">
            Comece a criar seu site agora mesmo com nossos templates exclusivos.
          </div>

          <Link
            href="/sites/new"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 transition px-5 py-3 font-semibold"
          >
            <span className="text-xl leading-none">＋</span> Criar Novo Site
          </Link>
        </div>

        {/* Atalhos */}
        <div className="col-span-6 md:col-span-1 rounded-2xl border border-white/10 bg-white/5 p-6 grid place-items-center">
          <Link href="/sites" className="text-white/80 hover:text-white text-sm font-semibold">
            Meus Sites
          </Link>
        </div>

        <div className="col-span-6 md:col-span-1 rounded-2xl border border-white/10 bg-white/5 p-6 grid place-items-center">
          <Link href="/sites/new" className="text-white/80 hover:text-white text-sm font-semibold">
            Criar Site
          </Link>
        </div>
      </div>

      {/* Histórico */}
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 border border-white/10">
              ⏱️
            </span>
            <div className="text-xl font-semibold">Histórico de Sites</div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <input
                placeholder="Buscar site..."
                className="w-[220px] rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm outline-none focus:border-violet-500/60"
              />
              <span className="absolute right-3 top-2.5 text-white/40">⌕</span>
            </div>

            <select className="rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm outline-none">
              <option>Todos</option>
              <option>Ativo</option>
              <option>Inativo</option>
            </select>

            <input
              placeholder="dd/mm/aaaa"
              className="w-[140px] rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm outline-none"
            />
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/60">
                <th className="text-left font-semibold py-3">Nome do Projeto</th>
                <th className="text-left font-semibold py-3">Status</th>
                <th className="text-left font-semibold py-3">Data</th>
                <th className="text-left font-semibold py-3">Última Edição</th>
                <th className="text-left font-semibold py-3">Domínio</th>
                <th className="text-left font-semibold py-3">Link</th>
                <th className="text-left font-semibold py-3">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-white/60">
                    Nenhum site criado ainda.
                  </td>
                </tr>
              ) : (
                rows.map((s) => (
                  <tr key={s.id} className="text-white/85">
                    <td className="py-4">
                      <div className="font-semibold">{s.project_name || s.slug}</div>
                      <div className="text-white/50 text-xs">{s.slug}</div>
                    </td>

                    <td className="py-4">
                      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-500/25 px-3 py-1 text-emerald-200">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        {s.status || "Ativo"}
                      </span>
                    </td>

                    <td className="py-4">{fmtDateBR(s.created_at)}</td>
                    <td className="py-4">{fmtDateBR(s.updated_at)}</td>
                    <td className="py-4 text-white/70">{s.domain || `${s.slug}.plpainel.com`}</td>

                    <td className="py-4">
                      <a
                        className="text-violet-300 hover:text-violet-200 underline"
                        href={`https://${s.domain || `${s.slug}.plpainel.com`}`}
                        target="_blank"
                      >
                        Abrir
                      </a>
                    </td>

                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/sites/${s.id}/edit`}
                          className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
                          title="Editar"
                        >
                          ✎
                        </Link>
                        <button
                          className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
                          title="Excluir"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
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
