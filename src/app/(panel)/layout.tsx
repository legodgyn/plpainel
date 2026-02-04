import { redirect } from "next/navigation";
import Sidebar from "@/components/panel/sidebar";
import Topbar from "@/components/panel/topbar";
import { supabaseServer } from "@/lib/supabase/server";


export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();

  if (!data?.user) redirect("/login");

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
