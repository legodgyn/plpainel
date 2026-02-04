import "@/app/globals.css";
import { redirect } from "next/navigation";

import Sidebar from "@/components/panel/sidebar";
import TopBar from "@/components/panel/topbar";
import WhatsappFloat from "@/components/panel/whatsapp-float";

import { supabaseServer } from "@/lib/supabase/server";

import { redirect } from "next/navigation";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();

  if (!data?.user) redirect("/login");

  // Se você já salva tokens no profile, depois a gente busca aqui.
  // Por enquanto mantém 0 ou coloca mock.
  const tokens = 0;

  return (
    <div className="min-h-screen bg-[#050A14] text-white">
      <div className="flex min-h-screen">
        <Sidebar />

        <main className="flex-1">
          <TopBar tokens={tokens} />
          <div className="p-6">{children}</div>
        </main>
      </div>

      <WhatsappFloat />
    </div>
  );
}
