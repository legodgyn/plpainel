"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

type TokenRow = { balance: number } | null;

function onlyDigits(v: string) {
  return String(v || "").replace(/\D/g, "");
}

function formatBRPhone(input: string) {
  const digitsRaw = onlyDigits(input);

  if (!digitsRaw) return "";

  let digits = digitsRaw;
  if (digits.length > 11) digits = digits.slice(-11);

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);

  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${ddd}) ${rest}`;

  if (digits.length === 10) {
    const p1 = rest.slice(0, 4);
    const p2 = rest.slice(4, 8);
    return `(${ddd}) ${p1}-${p2}`;
  }

  const r = digits.slice(2, 11);
  const p1 = r.slice(0, 5);
  const p2 = r.slice(5, 9);
  return `(${ddd}) ${p1}-${p2}`;
}

export default function PanelShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string>("");
  const [tokens, setTokens] = useState<number>(0);

  // modal whatsapp obrigatório
  const [needsWhatsapp, setNeedsWhatsapp] = useState(false);
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [whatsMsg, setWhatsMsg] = useState<string | null>(null);

  const ADMIN_MASTER_EMAIL = useMemo(() => {
    const env = (process.env.NEXT_PUBLIC_ADMIN_MASTER_EMAIL || "").trim().toLowerCase();
    return env || "teste@teste.com";
  }, []);

  const isAdminMaster = useMemo(() => {
    return String(email || "").trim().toLowerCase() === ADMIN_MASTER_EMAIL;
  }, [email, ADMIN_MASTER_EMAIL]);

  const baseNav = useMemo(
    () => [
      { href: "/dashboard", label: "Dashboard", icon: "📊" },
      { href: "/sites", label: "Meus Sites", icon: "🌐" },
      { href: "/sites/new", label: "Criar Site", icon: "➕" },
      { href: "/tokens", label: "Comprar Tokens", icon: "💳" },
      { href: "/billing", label: "Minhas Compras", icon: "🧾" },
      { href: "/sites/template-simples", label: "Alterar Layout", icon: "🎨" },
      { href: "/affiliate", label: "Afiliados", icon: "🤝" },
      { href: "/tutorial", label: "Tutorial", icon: "📚" },
    ],
    []
  );

  const nav = useMemo(() => {
    const items = [...baseNav];
    if (isAdminMaster) {
      items.push({ href: "/admin", label: "Compras na Plataforma", icon: "🛒" });
      items.push({ href: "/admin/pagamentos-afiliados", label: "Pagamentos Afiliados", icon: "💸" });
      items.push({ href: "/users", label: "Usuários", icon: "👥" });
      items.push({ href: "/loja", label: "Usuários", icon: "👥" });
    }
    return items;
  }, [baseNav, isAdminMaster]);

  const supportLink = useMemo(() => {
    const phone = "5562999994162";
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
      setProfileName(String(user.user_metadata?.name || "").trim());

      const { data: tokenRow } = await supabase
        .from("user_tokens")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle<TokenRow>();

      if (!alive) return;
      setTokens(tokenRow?.balance ?? 0);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("name, whatsapp")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!alive) return;

      if (profileError) {
        setNeedsWhatsapp(true);
      } else {
        const savedName = String(profileData?.name || user.user_metadata?.name || "").trim();
        const savedWhatsapp = String(profileData?.whatsapp || "").trim();

        setProfileName(savedName);
        setWhatsapp(savedWhatsapp ? formatBRPhone(savedWhatsapp) : "");

        if (!savedWhatsapp) {
          setNeedsWhatsapp(true);
        } else {
          setNeedsWhatsapp(false);
        }
      }

      setLoading(false);
    }

    boot();
    return () => {
      alive = false;
    };
  }, [router]);

  async function saveWhatsapp() {
    setWhatsMsg(null);

    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;

    if (!user) {
      router.push("/login");
      return;
    }

    const name = String(profileName || "").trim();
    const digits = onlyDigits(whatsapp);

    if (!name) {
      setWhatsMsg("Digite seu nome.");
      return;
    }

    if (!digits) {
      setWhatsMsg("Digite seu WhatsApp.");
      return;
    }

    if (digits.length < 10 || digits.length > 11) {
      setWhatsMsg("Digite um WhatsApp válido com DDD.");
      return;
    }

    setSavingWhatsapp(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        user_id: user.id,
        name,
        whatsapp: digits,
      });

      if (error) {
        setWhatsMsg(error.message || "Não foi possível salvar seu WhatsApp.");
        return;
      }

      setNeedsWhatsapp(false);
      setWhatsMsg(null);
    } finally {
      setSavingWhatsapp(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-[#0b1220]">
      {/* Top bar */}
      <div className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600">
        <div className="mx-auto max-w-[1600px] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
  <Image
    src="/logo1.png"
    alt="PL Painel"
    width={200}
    height={80}
    className="h-16 w-40"
  />
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
            <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent opacity-70" />
            <span className="relative flex items-center gap-2">
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

      <div className="mx-auto max-w-[1600px] px-4 py-8 flex gap-6">
        {/* Sidebar */}
        <aside className="w-64 shrink-0">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
  <Image
    src="/usuario.png"
    alt="PL Painel"
    width={40}
    height={40}
    className="h-10 w-10 rounded-xl object-cover"
  />
  <div className="min-w-0">
    <div className="text-white font-semibold truncate">{email || "Conta"}</div>
    <div className="text-white/60 text-xs truncate">Seja bem vindo!!</div>
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
              🚪 Sair
            </button>
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1">
          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
              Carregando painel...
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      {/* Modal obrigatório de WhatsApp */}
      {needsWhatsapp && (
        <div className="fixed inset-0 z-[999]">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px]" />
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b1220] p-6 shadow-[0_30px_120px_rgba(0,0,0,.65)]">
              <div>
                <div className="text-lg font-bold text-white">Complete seu cadastro</div>
                <div className="mt-1 text-sm text-white/60">
                  Antes de continuar, preencha seu nome e WhatsApp.
                </div>
              </div>

              {whatsMsg && (
                <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {whatsMsg}
                </div>
              )}

              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-xs text-white/70">Nome</label>
                  <input
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Seu nome"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-white outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/70">WhatsApp</label>
                  <input
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(formatBRPhone(e.target.value))}
                    placeholder="(62) 99999-9999"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-white outline-none focus:border-emerald-400"
                    autoComplete="tel"
                  />
                </div>

                <button
                  onClick={saveWhatsapp}
                  disabled={savingWhatsapp}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  {savingWhatsapp ? "Salvando..." : "Salvar e continuar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
