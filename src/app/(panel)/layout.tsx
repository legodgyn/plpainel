import "../globals.css";
import { supabaseServer } from "@/lib/supabase/server";
import Sidebar from "@/components/panel/Sidebar";
import TopBar from "@/components/panel/TopBar";
import WhatsappFloat from "@/components/panel/WhatsappFloat";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();
  const email = data?.user?.email ?? null;

  // opcional: buscar tokens (ajusta conforme sua tabela)
  let tokens = 0;
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("tokens, name")
      .eq("id", data?.user?.id)
      .maybeSingle();

    tokens = Number(profile?.tokens ?? 0);
    const name = (profile?.name as string) ?? null;

    return (
      <div className="min-h-screen bg-[#070b14] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(800px_circle_at_20%_10%,rgba(124,58,237,.20),transparent_55%),radial-gradient(700px_circle_at_70%_15%,rgba(59,130,246,.18),transparent_55%),radial-gradient(900px_circle_at_60%_80%,rgba(16,185,129,.10),transparent_60%)]" />
        <div className="relative flex">
          <Sidebar email={email} name={name} tokens={tokens} />

          <main className="flex-1 min-w-0">
            <TopBar />
            <div className="mx-auto max-w-[1180px] px-6 py-8">
              {children}
            </div>
          </main>

          <WhatsappFloat />
        </div>
      </div>
    );
  } catch {
    // fallback simples se profile/tabela ainda não existir
    return (
      <div className="min-h-screen bg-[#070b14] text-white">
        <div className="relative flex">
          <Sidebar email={email} name="Painel" tokens={0} />
          <main className="flex-1 min-w-0">
            <TopBar />
            <div className="mx-auto max-w-[1180px] px-6 py-8">{children}</div>
          </main>
          <WhatsappFloat />
        </div>
      </div>
    );
  }
}
