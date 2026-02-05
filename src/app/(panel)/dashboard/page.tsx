import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

function formatDateBR(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
}

export default async function DashboardPage() {
  const supabase = await supabaseServer();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  const user = authData?.user;

  if (authErr || !user) redirect("/login");

  // pega tokens do perfil (se tiver)
  const { data: profile } = await supabase
    .from("profiles")
    .select("name,tokens")
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    profile?.name ||
    (user.user_metadata?.name as string | undefined) ||
    user.email?.split("@")[0] ||
    "Usuário";

  const tokens = Number(profile?.tokens ?? 0);

  // lista sites do usuário (ajusta nome da tabela/colunas se precisar)
  const { data: sites } = await supabase
    .from("sites")
    .select("id,name,slug,status,updated_at,custom_domain")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(10);

  const rows = (sites ?? []).map((s) => ({
    id: s.id as string,
    name: (s.name as string) ?? (s.slug as string) ?? "-",
    status: (s.status as string) ?? "ativo",
    updated_at: (s.updated_at as string) ?? null,
    domain: (s.custom_domain as string) ?? `${s.slug}.plpainel.com`,
    slug: (s.slug as string) ?? "",
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold">
          Bem-vindo, {displayName}!
        </h1>
        <p className="text-white/60 mt-1">
          Gerencie seus sites e tokens de forma simples e eficiente.
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tokens */}
        <div className="rounded-2xl bg-gradient-to-br from-violet-600/80 to-violet-700/40 border border-white/10 p-5 shadow-[0_10px_40px_rgba(0,0,0,.25)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-white/70 text-sm">Tokens Disponíveis</div>
              <div className="text-5xl font-bold mt-2 leading-none">
                {tokens}
              </div>
              <div className="text-white/60 text-xs mt-3">
                Tokens necessários para criar sites
              </div>
            </div>

            <Link
              href="/comprar-tokens"
              className="rounded-xl bg-black/20 hover:bg-black/30 border border-white/10 px-3 py-2 text-sm font-medium transition"
            >
              Comprar Tokens
            </Link>
          </div>

          <div className="mt-4 h-2 rounded-full bg-black/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-white/70"
              style={{ width: `${Math.min(100, tokens * 10)}%` }}
            />
          </div>
        </div>

        {/* Criar novo site */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5 shadow-[0_10px_40px_rgba(0,0,0,.25)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">Criar Novo Site</div>
              <p className="text-white/60 text-sm mt-1">
                Comece a criar seu site agora mesmo com nossos templates.
              </p>
            </div>
          </div>

          <Link
            href="/sites/new"
            className="mt-4 inline-flex items-center justify-center w-full rounded-xl bg-violet-600 hover:bg-violet-500 transition px-4 py-3 font-medium"
          >
            + Criar Novo Site
          </Link>
        </div>

        {/* Ações rápidas */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5 shadow-[0_10px_40px_rgba(0,0,0,.25)]">
          <div className="text-lg font-semibold">Ações rápidas</div>

          <div className="mt-4 flex gap-2">
            <Link
              href="/sites/new"
              className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-500 transition px-4 py-3 text-center font-medium"
            >
              Criar Site
            </Link>
            <Link
              href="/sites"
              className="flex-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition px-4 py-3 text-center font-medium"
            >
              Meus Sites
            </Link>
          </div>

          <div className="mt-3 text-white/50 text-xs">
            Dica: use “Meus Sites” para editar, duplicar e publicar.
          </div>
        </div>
      </div>

      {/* Histórico */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 shadow-[0_10px_40px_rgba(0,0,0,.25)]">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="text-lg font-semibold">Histórico de Sites</div>
          </div>

          <div className="flex items-center gap-2">
            <input
              className="rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm outline-none"
              placeholder="Buscar site..."
              // server component: só UI (sem filtro real aqui)
              defaultValue=""
            />
            <select className="rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm outline-none">
              <option>Todos</option>
              <option>Ativo</option>
              <option>Inativo</option>
            </select>
            <input
              className="rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm outline-none"
              placeholder="dd/mm/aaaa"
              defaultValue=""
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-white/60">
              <tr className="border-b border-white/10">
                <th className="text-left font-medium py-3 pr-3">Nome do Projeto</th>
                <th className="text-left font-medium py-3 pr-3">Status</th>
                <th className="text-left font-medium py-3 pr-3">Data</th>
                <th className="text-left font-medium py-3 pr-3">Última Edição</th>
                <th className="text-left font-medium py-3 pr-3">Domínio</th>
                <th className="text-left font-medium py-3 pr-3">Link</th>
                <th className="text-right font-medium py-3">Ações</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="py-6 text-white/60" colSpan={7}>
                    Nenhum site encontrado ainda. Clique em <b>Criar Novo Site</b>.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-white/5">
                    <td className="py-4 pr-3 text-white/90">{r.name}</td>

                    <td className="py-4 pr-3">
                      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-500/20 px-3 py-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-300" />
                        {(r.status || "Ativo").toString()}
                      </span>
                    </td>

                    <td className="py-4 pr-3 text-white/80">
                      {formatDateBR(r.updated_at)}
                    </td>

                    <td className="py-4 pr-3 text-white/60">-</td>

                    <td className="py-4 pr-3 text-white/80">{r.domain}</td>

                    <td className="py-4 pr-3">
                      <a
                        className="text-violet-200 hover:text-violet-100 underline"
                        href={`https://${r.domain}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir
                      </a>
                    </td>

                    <td className="py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          className="rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 transition"
                          href={`/sites/${r.id}/edit`}
                        >
                          Editar
                        </Link>
                        <Link
                          className="rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 transition"
                          href={`/sites`}
                        >
                          Ver
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <Link
            href="/sites"
            className="text-sm text-white/70 hover:text-white underline"
          >
            Ver todos os sites →
          </Link>
        </div>
      </div>
    </div>
  );
}
