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

  // ✅ Define aqui o email do admin master (preferência: ENV)
  const ADMIN_MASTER_EMAIL = useMemo(() => {
    const env = (process.env.NEXT_PUBLIC_ADMIN_MASTER_EMAIL || "").trim().toLowerCase();
    return env || "teste@teste.com"; // <- TROCA PELO SEU se não for usar ENV
  }, []);

  const isAdminMaster = useMemo(() => {
    return String(email || "").trim().toLowerCase() === ADMIN_MASTER_EMAIL;
  }, [email, ADMIN_MASTER_EMAIL]);

  // ✅ Nav normal (sem admin)
  const baseNav = useMemo(
    () => [
      { href: "/dashboard", label: "Dashboard", icon: "▦" },
      { href: "/sites", label: "Meus Sites", icon: "▤" },
      { href: "/sites/new", label: "Criar Site", icon: "+" },
      { href: "/tokens", label: "Comprar Tokens", icon: "◈" },
      { href: "/billing", label: "Minhas Compras", icon: "◈" },
      { href: "/affiliate", label: "Afiliados", icon: "◈" },
    ],
    []
  );

  // ✅ Nav final (adiciona o admin só se for master)
  const nav = useMemo(() => {
    const items = [...baseNav];
    if (isAdminMaster) {
      items.push({ href: "/admin", label: "Compras na Plataforma", icon: "◈" });
    }
    return items;
  }, [baseNav, isAdminMaster]);

  // ✅ Link WhatsApp suporte
  const supportLink = useMemo(() => {
    const phone = "5562999994162"; // DDI +55 + seu número
    const text = encodeURIComponent("Olá! Preciso de suporte no plpainel.");
    return `https://wa.me/${phone}?text=${text}`;
  }, []);

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
      {/* ✅ Top bar PREMIUM */}
      <div className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-black/20 border border-white/10 flex items-center justify-center text-white font-black">
              PL
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-white">plpainel.com — Painel</div>
              <div className="text-[11px] text-white/70">Suporte rápido via WhatsApp</div>
            </div>
          </div>

          <a
            href={supportLink}
            target="_blank"
            rel="noopener noreferrer"
            className={[
              "group relative inline-flex items-center gap-2 rounded-full",
              "bg-emerald-500 px-5 py-2 text-sm font-semibold text-white",
              "shadow-lg shadow-emerald-900/30",
              "transition-all duration-200",
              "hover:bg-emerald-400 hover:shadow-emerald-900/40 hover:scale-[1.03]",
              "active:scale-[0.98]",
              "border border-white/10",
            ].join(" ")}
          >
            {/* brilho premium */}
            <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent opacity-70" />
            <span className="relative flex items-center gap-2">
              {/* ícone WhatsApp (SVG) */}
              <svg
                className="h-4 w-4"
                viewBox="0 0 32 32"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M19.11 17.44c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.14-.42-2.17-1.34-.8-.72-1.34-1.6-1.5-1.87-.16-.27-.02-.42.12-.55.12-.12.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.48-.84-2.03-.22-.53-.44-.46-.61-.47l-.52-.01c-.18 0-.48.07-.73.34-.25.27-.95.93-.95 2.27 0 1.34.98 2.63 1.12 2.81.14.18 1.93 2.95 4.68 4.13.65.28 1.16.45 1.56.58.66.21 1.26.18 1.73.11.53-.08 1.6-.65 1.83-1.28.23-.63.23-1.17.16-1.28-.07-.11-.25-.18-.52-.32z" />
                <path d="M26.67 5.33A14.53 14.53 0 0 0 16.02 1C8.02 1 1.5 7.52 1.5 15.52c0 2.56.67 5.06 1.95 7.26L1 31l8.41-2.4a14.48 14.48 0 0 0 6.61 1.6h.01c8 0 14.52-6.52 14.52-14.52 0-3.88-1.51-7.52-4.38-10.35zM16.03 27.62h-.01c-2.23 0-4.42-.6-6.34-1.73l-.45-.27-4.99 1.42 1.46-4.87-.29-.5a12.1 12.1 0 0 1-1.85-6.14c0-6.68 5.44-12.12 12.13-12.12 3.24 0 6.29 1.26 8.58 3.55 2.29 2.29 3.55 5.34 3.55 8.58 0 6.68-5.44 12.08-12.12 12.08z" />
              </svg>

              <span>Falar com o suporte</span>
              <span className="ml-1 text-white/90 transition-transform duration-200 group-hover:translate-x-0.5">
                →
              </span>
            </span>
          </a>
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
