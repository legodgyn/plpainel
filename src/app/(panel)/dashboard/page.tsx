import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function formatDateBR(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  // user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ==========================
  // AJUSTE SE PRECISAR:
  // Se sua tabela não for "profiles" ou a coluna não for "tokens",
  // troque aqui.
  // ==========================
  const { data: profile } = await supabase
    .from("profiles")
    .select("tokens, full_name")
    .eq("id", user!.id)
    .maybeSingle();

  const tokens = Number(profile?.tokens ?? 0);
  const displayName =
    profile?.full_name?.trim() || user?.email?.split("@")[0] || "Usuário";

  // ==========================
  // AJUSTE SE PRECISAR:
  // Se sua tabela de sites não for "sites", troque aqui.
  // ==========================
  const { data: sites } = await supabase
    .from("sites")
    .select("id, slug, domain, status, created_at, updated_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold">
          Bem-vindo, {displayName}!
        </h1>
        <p className="mt-1 text-white/60">
          Gerencie seus sites e tokens de forma simples e eficiente.
        </p>
      </div>

      {/* Cards top */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Tokens */}
        <div className="lg:col-span-4">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#7c3aed] to-[#5b21b6] p-6 shadow-[0_25px_60px_rgba(0,0,0,.35)]">
            <div className="flex items-center justify-between">
              <div className="text-sm text-white/80">Tokens Disponíveis</div>
              <Link
                href="/tokens"
                className="rounded-full bg-black/20 px-3 py-1 text-xs font-medium hover:bg-black/30"
              >
                Comprar Tokens
              </Link>
            </div>

            <div className="mt-5 text-6xl font-bold leading-none">{tokens}</div>

            <div className="mt-5">
              <div className="h-2 w-full rounded-full bg-white/20" />
              <div className="mt-2 text-xs text-white/80">
                Tokens necessários para criar sites
              </div>
            </div>
          </div>
        </div>

        {/* Criar site */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_25px_60px_rgba(0,0,0,.25)]">
            <div className="text-lg font-semibold">Criar Novo Site</div>
            <p className="mt-1 text-sm text-white/60">
              Comece a criar seu site agora mesmo com nossos templates exclusivos.
            </p>

            <div className="mt-5">
              <Link
                href="/sites/new"
                className="inline-flex items-center gap-2 rounded-xl bg-[#7c3aed] px-5 py-3 text-sm font-semibold hover:bg-[#6d28d9]"
              >
                <span className="text-lg leading-none">+</span> Criar Novo Site
              </Link>
            </div>
          </div>
        </div>

        {/* Atalhos */}
        <div className="lg:col-span-3 grid grid-cols-2 gap-5">
          <Link
            href="/sites"
            className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 shadow-[0_25px_60px_rgba(0,0,0,.25)]"
          >
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7c3aed]/20">
              ▤
            </div>
            <div className="mt-4 text-lg font-semibold">Meus Sites</div>
            <div className="text-sm text-white/60">Gerencie seus sites</div>
          </Link>

          <Link
            href="/sites/new"
            className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 shadow-[0_25px_60px_rgba(0,0,0,.25)]"
          >
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20">
              +
            </div>
            <div className="mt-4 text-lg font-semibold">Criar Site</div>
            <div className="text-sm text-white/60">Crie um novo site</div>
          </Link>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_25px_60px_rgba(0,0,0,.25)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5">
              ⏱
            </span>
            <div>
              <div className="text-lg font-semibold">Histórico de Sites</div>
              <div className="text-sm text-white/60">
                Seus últimos sites criados
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              placeholder="Buscar site..."
              className="h-10 w-full sm:w-[240px] rounded-xl border border-white/10 bg-[#0b1220] px-3 text-sm outline-none focus:border-white/20"
            />
            <select className="h-10 rounded-xl border border-white/10 bg-[#0b1220] px-3 text-sm outline-none focus:border-white/20">
              <option>Todos</option>
              <option>Ativo</option>
              <option>Inativo</option>
            </select>
            <input
              placeholder="dd/mm/aaaa"
              className="h-10 rounded-xl border border-white/10 bg-[#0b1220] px-3 text-sm outline-none focus:border-white/20"
            />
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="text-left text-white/60">
                <th className="py-3 pr-4">Nome do Projeto</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Data</th>
                <th className="py-3 pr-4">Última Edição</th>
                <th className="py-3 pr-4">Domínio</th>
                <th className="py-3 pr-4">Link</th>
                <th className="py-3 pr-2 text-right">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {(sites ?? []).length === 0 ? (
                <tr>
                  <td className="py-6 text-white/60" colSpan={7}>
                    Nenhum site ainda. Clique em <b>Criar Novo Site</b>.
                  </td>
                </tr>
              ) : (
                (sites ?? []).map((s) => {
                  const slug = s.slug ?? s.domain ?? "site";
                  const status = (s.status ?? "active").toString();
                  const isActive = status === "active" || status === "ativo";
                  const domain = s.domain || `${slug}.plpainel.com`;

                  return (
                    <tr key={s.id} className="hover:bg-white/5">
                      <td className="py-4 pr-4 font-medium">{slug}</td>

                      <td className="py-4 pr-4">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                            isActive
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-red-500/15 text-red-300"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              isActive ? "bg-emerald-300" : "bg-red-300"
                            }`}
                          />
                          {isActive ? "Ativo" : "Inativo"}
                        </span>
                      </td>

                      <td className="py-4 pr-4">
                        {formatDateBR(s.created_at)}
                      </td>

                      <td className="py-4 pr-4">
                        {formatDateBR(s.updated_at)}
                      </td>

                      <td className="py-4 pr-4 text-white/80">{domain}</td>

                      <td className="py-4 pr-4">
                        <a
                          href={`https://${domain}`}
                          target="_blank"
                          className="text-[#a78bfa] hover:underline"
                        >
                          Abrir
                        </a>
                      </td>

                      <td className="py-4 pr-2 text-right">
                        <div className="inline-flex items-center gap-3">
                          <Link
                            href={`/sites/${s.id}/edit`}
                            className="text-white/70 hover:text-white"
                            title="Editar"
                          >
                            ✎
                          </Link>
                          <button
                            className="text-white/70 hover:text-white"
                            title="Excluir"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
