import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Sidebar from "@/components/panel/Sidebar";
import TopBar from "@/components/panel/TopBar";
import WhatsappFloat from "@/components/panel/WhatsappFloat";
import { supabaseServer } from "@/lib/supabase/server";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[#070A12] text-white">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1">
          <TopBar />
          <main className="px-6 py-6">{children}</main>
        </div>
      </div>
      <WhatsappFloat />
    </div>
  );
}
