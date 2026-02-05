import Link from "next/link";

export default function TopBar({
  email,
  tokens,
}: {
  email?: string | null;
  tokens?: number | null;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-[#05070F]/60 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6">
        <div className="text-sm text-white/70">
          {email ? (
            <>
              Bem-vindo, <span className="text-white">{email}</span>
            </>
          ) : (
            <span className="text-white/60">Gerencie seus sites e tokens.</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm">
            <span className="text-white/60">Tokens:</span>{" "}
            <span className="text-white font-semibold">{tokens ?? 0}</span>
          </div>

          <Link
            href="/buy"
            className="rounded-xl bg-violet-600 px-3 py-1.5 text-sm font-medium hover:bg-violet-500"
          >
            Comprar Tokens
          </Link>
        </div>
      </div>
    </header>
  );
}
