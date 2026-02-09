import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

type Site = {
  id: string;
  slug: string;
  name: string | null;
  created_at: string;
};

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export default async function SitesPage() {
  try {
    const cookieStore = await cookies();

    // pega user via cookies
    const supabaseAuth = createServerClient(
      env("NEXT_PUBLIC_SUPABASE_URL"),
      env("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {}
          },
        },
      }
    );

    const {
      data: { user },
      error: userErr,
    } = await supabaseAuth.auth.getUser();

    if (userErr) {
      console.error("[/sites] getUser error:", userErr);
    }

    if (!user) {
      return (
        <div className="p-6">
          <div className="text-white/80">Não autenticado.</div>
          <Link className="text-indigo-400 underline" href="/login">
            Ir para login
          </Link>
        </div>
      );
    }

    // admin para ler tabela
    const supabaseAdmin = createClient(
      env("NEXT_PUBLIC_SUPABASE_URL"),
      env("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } }
    );

    const { data: sites, error } = await supabaseAdmin
      .from("sites")
      .select("id, slug, name, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[/sites] query error:", error);
    }

    const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "plpainel.com";
    const isDev = process.env.NODE_ENV !== "production";

    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Meus Sites</h1>

          <Link
            href="/sites/new"
            className="px-4 py-2 rounded bg-indigo-600 text-white text-sm"
          >
            + Criar Site
          </Link>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            Erro ao carregar sites: {error.message}
          </div>
        ) : null}

        {!sites || sites.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-white/70">
            Você ainda não tem sites.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {sites.map((site: Site) => {
              const publicUrl = isDev
                ? `/s/${site.slug}`
                : `https://${site.slug}.${ROOT_DOMAIN}`;

              return (
                <div
                  key={site.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="font-semibold text-lg">
                    {site.slug}.{ROOT_DOMAIN}
                  </div>

                  <div className="text-sm text-white/60 mt-1">
                    Criado em:{" "}
                    {new Date(site.created_at).toLocaleDateString("pt-BR")}
                  </div>

                  <div className="flex gap-2 mt-4">
                    {isDev ? (
                      <Link
                        href={publicUrl}
                        className="px-3 py-1 rounded bg-indigo-600 text-sm text-white"
                      >
                        Abrir
                      </Link>
                    ) : (
                      <a
                        href={publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 rounded bg-indigo-600 text-sm text-white"
                      >
                        Abrir
                      </a>
                    )}

                    <Link
                      href={`/sites/${site.id}/edit`}
                      className="px-3 py-1 rounded bg-zinc-700 text-sm text-white"
                    >
                      Editar
                    </Link>

                    <Link
                      href={`/sites/${site.id}/delete`}
                      className="px-3 py-1 rounded bg-red-600/80 text-sm text-white"
                    >
                      Excluir
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  } catch (e: any) {
    console.error("[/sites] fatal:", e);
    return (
      <div className="p-6 text-red-200">
        Erro fatal em /sites: {e?.message || "unknown"}
      </div>
    );
  }
}
