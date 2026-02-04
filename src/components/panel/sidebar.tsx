import Link from "next/link";

type SidebarProps = {
  email?: string | null;
  name?: string | null;
  tokens?: number;
};

export default function Sidebar({ email, name, tokens = 0 }: SidebarProps) {
  return (
    <aside className="w-[280px] shrink-0 border-r border-white/10 bg-[#0b1220]/70 backdrop-blur-xl">
      <div className="p-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 grid place-items-center shadow-[0_10px_25px_rgba(124,58,237,.25)]">
            <span className="text-white font-bold">P</span>
          </div>

          <div className="min-w-0">
            <div className="text-white font-semibold truncate">{name || "Painel"}</div>
            <div className="text-white/60 text-sm truncate">{email || "—"}</div>
          </div>
        </div>

        <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-violet-400" />
          <span className="text-white/80 text-sm font-medium">{tokens} Tokens</span>
        </div>
      </div>

      <nav className="px-3 pb-5">
        <div className="space-y-1">
          <NavItem href="/dashboard" label="Dashboard" />
          <NavItem href="/sites" label="Meus Sites" />
          <NavItem href="/sites/new" label="Criar Site" />
          <NavItem href="/tokens" label="Comprar Tokens" />
        </div>

        <div className="mt-6 border-t border-white/10 pt-4">
          <NavItem href="/logout" label="Sair" />
        </div>
      </nav>
    </aside>
  );
}

function NavItem({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl px-3 py-3 text-white/80 hover:text-white hover:bg-white/5 transition"
    >
      <span className="h-2 w-2 rounded-full bg-white/20 group-hover:bg-violet-400 transition" />
      <span className="font-medium">{label}</span>
    </Link>
  );
}
