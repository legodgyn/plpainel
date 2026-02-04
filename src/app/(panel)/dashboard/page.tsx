import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_60px_rgba(0,0,0,.35)]">
      <div className="text-white/80 text-sm">{title}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = supabaseServer();

  const { data } = await supabase.auth.getUser();
  const user = data.user;

  // tokens
  const { data: profile } = await supabase
    .from("profiles")
    .select("tokens")
    .eq("id", user!.id)
    .maybeSingle();

  const tokens = profile?.tokens ?? 0;

  // sites (se tiver tabela)
  const { data: sites } = await supabase
    .from("sites")
    .select("id, slug, domain, status, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div>
      <div className="text-3xl font-semibold">Dashboard</div>
      <div className="mt-1 text-white/70">Gerencie seus sites e tokens.</div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 rounded-2xl bg-gradient-to-br from-violet-700/80 to-violet-500/40 border border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div className="text-white/80 text-sm">Tokens Disponíveis</div>
            <Link
              href="/buy"
              className="rounded-full bg-white/15 px-3 py-1 text-xs hover:bg-white/20"
            >
              Comprar Tokens
            </Link>
          </div>
          <div className="mt-4 text-5xl font-bold">{tokens}</div>
          <div className="mt-4 h-2 w-full rounded-full bg-black/30">
            <div className="h-2 w-[35%] rounded-full bg-white/70" />
          </div>
          <div className="mt-2 text-xs text-white/70">
            Tokens necessários para criar sites
          </div>
        </div>

        <Card title="Criar Novo Site">
          <div className="text-white/70 text-sm">
            Comece a criar seu site agora mesmo com nossos templates exclusivos.
          </div>
          <Link
            href="/sites/new"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 font-medium hover:bg-violet-500"
          >
            <span className="text-lg">+</span> Criar Novo Site
          </Link>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card title="Meus Sites">
            <div className="text-white/70 text-sm">Gerencie seus sites</div>
            <Link className="mt-3 inline-block underline" href="/sites">
              Abrir
            </Link>
          </Card>

          <Card title="Criar Site">
            <div className="text-white/70 text-sm">Crie um novo site</div>
            <Link className="mt-3 inline-block underline" href="/sites/new">
              Abrir
            </Link>
          </Card>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-lg font-semibold">Histórico de Sites</div>
          <input
            placeholder="Buscar site..."
            className="w-[260px] rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
          />
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-white/70">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Nome do Projeto</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Data</th>
                <th className="px-4 py-3 text-left font-medium">Domínio</th>
                <th className="px-4 py-3 text-left font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(sites ?? []).map((s) => (
                <tr key={s.id} className="border-t border-white/10">
                  <td className="px-4 py-3">{s.slug}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-200">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      {s.status ?? "Ativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {s.created_at ? new Date(s.created_at).toLocaleDateString("pt-BR") : "-"}
                  </td>
                  <td className="px-4 py-3 text-white/80">{s.domain ?? "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link className="underline" href={`/sites/${s.id}/edit`}>
                        Editar
                      </Link>
                      {s.domain ? (
                        <a className="underline" href={`https://${s.domain}`} target="_blank" rel="noreferrer">
                          Abrir
                        </a>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}

              {(sites ?? []).length === 0 && (
                <tr className="border-t border-white/10">
                  <td className="px-4 py-6 text-white/60" colSpan={5}>
                    Nenhum site ainda. Clique em <b>Criar Novo Site</b>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
