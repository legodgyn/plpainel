"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { label: "Dashboard", href: "/dashboard", icon: "▦" },
  { label: "Meus Sites", href: "/sites", icon: "▤" },
  { label: "Criar Site", href: "/sites/new", icon: "+" },
  { label: "Comprar Tokens", href: "/tokens", icon: "⬣" },
];

function cx(...classes: Array<string | boolean | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[260px] shrink-0 border-r border-white/10 bg-[#0a1020]">
      <div className="px-5 py-6">
        <div className="text-lg font-semibold">plpainel</div>
        <div className="text-sm text-white/60">Painel</div>
      </div>

      <nav className="px-3">
        {items.map((it) => {
          const active =
            pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cx(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition",
                active ? "bg-white/10" : "hover:bg-white/5",
              )}
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/5">
                {it.icon}
              </span>
              <span className="font-medium">{it.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 px-5">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm text-white/70">Dica</div>
          <div className="mt-1 text-sm">
            Crie sites e gerencie tokens por aqui.
          </div>
        </div>
      </div>

      <div className="mt-6 px-5 pb-6">
        <Link
          href="/logout"
          className="block rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm hover:bg-white/10"
        >
          Sair
        </Link>
      </div>
    </aside>
  );
}
