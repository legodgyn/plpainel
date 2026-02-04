"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Item = { href: string; label: string };

const items: Item[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/sites", label: "Meus Sites" },
  { href: "/sites/new", label: "Criar Site" },
  { href: "/buy", label: "Comprar Tokens" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const supabase = supabaseBrowser();

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <aside className="w-[260px] shrink-0 border-r border-white/10 bg-[#070A12]/60 backdrop-blur-xl">
      <div className="px-5 py-5 border-b border-white/10">
        <div className="text-lg font-semibold">plpainel</div>
        <div className="text-xs text-white/60">Painel</div>
      </div>

      <nav className="px-3 py-4 space-y-1">
        {items.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <Link
              key={it.href}
              href={it.href}
              className={[
                "flex items-center gap-3 rounded-xl px-3 py-2 transition",
                active ? "bg-violet-600/20 text-white" : "text-white/80 hover:bg-white/5",
              ].join(" ")}
            >
              <span className="h-2 w-2 rounded-full bg-violet-400/80" />
              {it.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-3 pb-4">
        <button
          onClick={logout}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/80 hover:bg-white/10"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
