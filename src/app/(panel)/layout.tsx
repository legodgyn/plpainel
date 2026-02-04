import "../globals.css";
import Link from "next/link";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#070A12] text-white">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-screen border-r border-white/10 bg-white/5">
          <div className="p-5 border-b border-white/10">
            <div className="font-semibold">plpainel</div>
            <div className="text-white/60 text-sm">Painel</div>
          </div>

          <nav className="p-3 space-y-2">
            <Link className="block rounded-xl px-3 py-2 hover:bg-white/10" href="/dashboard">
              Dashboard
            </Link>
            <Link className="block rounded-xl px-3 py-2 hover:bg-white/10" href="/sites">
              Meus Sites
            </Link>
            <Link className="block rounded-xl px-3 py-2 hover:bg-white/10" href="/sites/new">
              Criar Site
            </Link>
            <Link className="block rounded-xl px-3 py-2 hover:bg-white/10" href="/tokens">
              Comprar Tokens
            </Link>
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1">
          <div className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-white/5">
            <div className="text-white/80 text-sm">
              Gerencie seus sites e tokens.
            </div>
            <div className="text-white/60 text-sm">
              {/* depois colocamos tokens e perfil aqui */}
            </div>
          </div>

          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
