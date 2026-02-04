"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/panel/sidebar";
import Topbar from "@/components/panel/topbar";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const supabase = supabaseBrowser();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function check() {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      // se não tiver sessão e não estiver em rotas públicas do painel
      if (!session && pathname !== "/login" && pathname !== "/register") {
        window.location.href = "/login";
        return;
      }

      setReady(true);
    }

    check();
  }, [pathname]);

  if (!ready) return <div className="min-h-screen bg-[#0b1220] text-white p-6">Carregando...</div>;

  return (
    <div className="min-h-screen bg-[#0b1220] text-white">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 min-w-0">
          <Topbar />
          <main className="px-6 pb-10 pt-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
