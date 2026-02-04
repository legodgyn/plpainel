import "@/app/globals.css";
import { redirect } from "next/navigation";
import Sidebar from "@/components/panel/Sidebar";
import TopBar from "@/components/panel/TopBar";
import WhatsappFloat from "@/components/panel/WhatsappFloat";
import { supabaseServer } from "@/lib/supabase/server";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = supabaseServer();

  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) redirect("/login");

  // Se você já tem tabela profiles, aqui você busca tokens.
  // Se não tiver, deixa 0 por enquanto.
  let tokens = 0;

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("tokens")
      .eq("id", user.id)
      .maybeSingle();

    tokens = profile?.tokens ?? 0;
  } catch {
    tokens = 0;
  }

  return (
    <div className="min-h-screen bg-[#05070F] text-white">
      <div className="flex min-h-screen">
        <Sidebar />

        <main className="flex-1">
          <TopBar email={user.email} tokens={tokens} />

          <div className="mx-auto max-w-[1200px] px-6 py-6">{children}</div>
        </main>
      </div>

      <WhatsappFloat />
    </div>
  );
}
