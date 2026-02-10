import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

type Site = {
  id: string;
  slug: string;
  name: string;
  created_at: string;
};

export default async function SitesPage() {
  const supabase = createServerComponentClient({
    cookies,
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // se preferir, pode renderizar o texto ao invés de redirect
    redirect("/login");
  }

  const { data: sites } = await supabase
    .from("sites")
    .select("id, slug, name, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "plpainel.com";
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Meus Sites</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sites?.map((site: Site) => {
          // ✅ PROD: subdomínio
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
                    className="px-3 py-1 rounded bg-indigo-600 text-sm"
                  >
                    Abrir
                  </Link>
                ) : (
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 rounded bg-indigo-600 text-sm"
                  >
                    Abrir
                  </a>
                )}

                <Link
                  href={`/sites/${site.id}/edit`}
                  className="px-3 py-1 rounded bg-zinc-700 text-sm"
                >
                  Editar
                </Link>

                <Link
                  href={`/sites/${site.id}/delete`}
                  className="px-3 py-1 rounded bg-red-600/80 text-sm"
                >
                  Excluir
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
