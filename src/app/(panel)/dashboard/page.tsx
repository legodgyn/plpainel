import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await supabaseServer();


  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    redirect("/login");
  }

  const user = authData.user;

  // Exemplo: buscar tokens do usuário (ajuste p/ seu schema)
  const { data: profile } = await supabase
    .from("profiles")
    .select("tokens")
    .eq("id", user.id)
    .single();

  const tokens = profile?.tokens ?? 0;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-semibold">Dashboard</h1>
      <p className="text-white/70 mt-1">Bem-vindo, {user.email}</p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="text-white/70 text-sm">Tokens disponíveis</div>
          <div className="text-4xl font-bold mt-2">{tokens}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="text-white/70 text-sm">Ações rápidas</div>
          <div className="flex gap-3 mt-4">
            <Link
              href="/sites/new"
              className="rounded-xl bg-violet-600 hover:bg-violet-500 transition px-4 py-2 font-medium"
            >
              Criar Site
            </Link>
            <Link
              href="/sites"
              className="rounded-xl bg-white/10 hover:bg-white/15 transition px-4 py-2 font-medium"
            >
              Meus Sites
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
