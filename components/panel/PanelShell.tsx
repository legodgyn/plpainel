"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

type TokenRow = { balance: number } | null;

export default function PanelShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string>("");
  const [tokens, setTokens] = useState<number>(0);

  const nav = useMemo(
    () => [
      { href: "/dashboard", label: "Dashboard", icon: "▦" },
      { href: "/sites", label: "Meus Sites", icon: "▤" },
      { href: "/sites/new", label: "Criar Site", icon: "+" },
      { href: "/tokens", label: "Comprar Tokens", icon: "◈" },
      { href: "/billing", label: "Minhas Compras", icon: "◈" },
    ],
    []
  );

  useEffect(() => {
    let alive = true;

    async function boot() {
      setLoading(true);

      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) {
        router.push("/login");
        return;
      }

      if (!alive) return;
      setEmail(user.email ?? "");

      const { data: tokenRow } = await supabase
        .from("user_tokens")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle<TokenRow>();

      if (!alive) return;
      setTokens(tokenRow?.balance ?? 0);
      setLoading(false);
    }

    boot();
    return () => {
      alive = false;
    };
  }, [router]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-[#0b1220]">
      {/* Top bar */}
      <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600">
        <div className="mx-auto max-w-6xl px-4 py-2 flex items-center justify-between text-sm text-white">
          <span>plpainel.com — Painel</span>
          <span className="rounded-full bg-black/20 px-3 py-1">
            Tokens: <b>{tokens}</b>
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 flex gap-6">
        {/* Sidebar */}
        <aside className="w-64 shrink-0">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-violet-600/30 border border-white/10 flex items-center justify-center text-white font-bold">
                P
              </div>
              <div className="min-w-0">
                <div className="text-white font-semibold truncate">{email || "Conta"}</div>
                <div className="text-white/60 text-xs truncate">Acesso ao painel</div>
              </div>
            </div>

            <nav className="mt-5 space-y-1">
              {nav.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm",
                      active
                        ? "bg-violet-600/25 border border-violet-400/30 text-white"
                        : "text-white/75 hover:bg-white/10 border border-transparent",
                    ].join(" ")}
                  >
                    <span className="w-6 text-center">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <button
              onClick={signOut}
              className="mt-5 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
            >
              Sair
            </button>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1">
          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
              Carregando painel...
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
