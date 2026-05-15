"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

type ExtraPermissions = {
  can_change_layout: boolean;
  can_transfer_sites: boolean;
  can_view_orders: boolean;
  can_manage_suggestions: boolean;
  can_use_custom_domain: boolean;
};

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

type PanelTheme = "light" | "dark";

const emptyPermissions: ExtraPermissions = {
  can_change_layout: false,
  can_transfer_sites: false,
  can_view_orders: false,
  can_manage_suggestions: false,
  can_use_custom_domain: false,
};

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
    return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4, 8)}`;
  }

  const mobile = digits.slice(2, 11);
  return `(${ddd}) ${mobile.slice(0, 5)}-${mobile.slice(5, 9)}`;
}

export default function PanelShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [extraPermissions, setExtraPermissions] =
    useState<ExtraPermissions>(emptyPermissions);

  const [needsWhatsapp, setNeedsWhatsapp] = useState(false);
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [whatsMsg, setWhatsMsg] = useState<string | null>(null);
  const [theme, setTheme] = useState<PanelTheme>("light");
  const [themeReady, setThemeReady] = useState(false);

  const ADMIN_MASTER_EMAIL = useMemo(() => {
    const env = (process.env.NEXT_PUBLIC_ADMIN_MASTER_EMAIL || "")
      .trim()
      .toLowerCase();
    return env || "teste@teste.com";
  }, []);

  const isAdminMaster = useMemo(
    () => String(email || "").trim().toLowerCase() === ADMIN_MASTER_EMAIL,
    [email, ADMIN_MASTER_EMAIL]
  );

  const canChangeLayout = isAdminMaster || extraPermissions.can_change_layout;
  const canTransferSites = isAdminMaster || extraPermissions.can_transfer_sites;
  const canViewOrders = isAdminMaster || extraPermissions.can_view_orders;
  const canManageSuggestions =
    isAdminMaster || extraPermissions.can_manage_suggestions;

  const baseNav = useMemo<NavItem[]>(
    () => [
      { href: "/dashboard", label: "Dashboard", icon: "📊" },
      { href: "/loja", label: "Loja", icon: "🛍️" },
      { href: "/sites", label: "Meus Sites", icon: "🌐" },
      { href: "/sites/new", label: "Criar Site", icon: "➕" },
      { href: "/tokens", label: "Comprar Tokens", icon: "💳" },
      { href: "/billing", label: "Minhas Compras", icon: "🧾" },
      { href: "/affiliate", label: "Afiliados", icon: "🤝" },
      { href: "/tutorial", label: "Tutorial", icon: "📚" },
      { href: "/sugestoes", label: "Sugestões e Melhorias", icon: "💡" },
    ],
    []
  );

  const customDomainNav = useMemo<NavItem[]>(
    () => [
      {
        href: "/sites/custom-domain",
        label: "Conectar domínio próprio",
        icon: "✨",
      },
      {
        href: "/sites/domain-subdomain",
        label: "Criar site em domínio conectado",
        icon: "➕",
      },
      { href: "/domains/my", label: "Meus domínios", icon: "🌍" },
      { href: "/emails", label: "Emails", icon: "✉️" },
    ],
    []
  );

  const customDomainGroupActive = useMemo(
    () =>
      customDomainNav.some(
        (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
      ),
    [customDomainNav, pathname]
  );

  const nav = useMemo<NavItem[]>(() => {
    const items = [...baseNav];

    if (canChangeLayout) {
      items.push({
        href: "/sites/template-simples",
        label: "Alterar Layout",
        icon: "🎨",
      });
    }

    if (canViewOrders) {
      items.push({
        href: "/admin",
        label: "Compras na Plataforma",
        icon: "🛒",
      });
    }

    if (isAdminMaster) {
      items.push({
        href: "/admin/pagamentos-afiliados",
        label: "Pagamentos Afiliados",
        icon: "💸",
      });
      items.push({ href: "/users", label: "Usuários", icon: "👥" });
      items.push({
        href: "https://bm.plpainel.com/dashboard.html",
        label: "Controle de BM's",
        icon: "📈",
      });

      if (canTransferSites) {
        items.push({
          href: "/admin/transferir-sites",
          label: "Transferências",
          icon: "🔄",
        });
      }

      items.push({
        href: "/admin/updates",
        label: "Atualizações",
        icon: "🛠️",
      });

      if (canManageSuggestions) {
        items.push({
          href: "/admin/sugestoes",
          label: "Sugestões (Admin)",
          icon: "💡",
        });
      }

      items.push({
        href: "/admin/permissoes",
        label: "Permissões Extras",
        icon: "🔐",
      });
    }

    return items;
  }, [
    baseNav,
    canChangeLayout,
    canTransferSites,
    canViewOrders,
    canManageSuggestions,
    isAdminMaster,
  ]);

  const supportLink = useMemo(() => {
    const phone = "5562999994162";
    const text = encodeURIComponent("Olá! Preciso de suporte no PLPainel.");
    return `https://wa.me/${phone}?text=${text}`;
  }, []);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("plpainel-theme");
    const nextTheme: PanelTheme = savedTheme === "dark" ? "dark" : "light";

    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    setThemeReady(true);
  }, []);

  useEffect(() => {
    if (!themeReady) return;

    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("plpainel-theme", theme);

    return () => {
      document.documentElement.removeAttribute("data-theme");
    };
  }, [theme, themeReady]);

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

      const { data: permissionData } = await supabase
        .from("user_extra_permissions")
        .select(
          "can_change_layout, can_transfer_sites, can_view_orders, can_manage_suggestions, can_use_custom_domain"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (!alive) return;
      setExtraPermissions({
        can_change_layout: Boolean(permissionData?.can_change_layout),
        can_transfer_sites: Boolean(permissionData?.can_transfer_sites),
        can_view_orders: Boolean(permissionData?.can_view_orders),
        can_manage_suggestions: Boolean(permissionData?.can_manage_suggestions),
        can_use_custom_domain: Boolean(permissionData?.can_use_custom_domain),
      });

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("name, whatsapp")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!alive) return;

      if (profileError) {
        setNeedsWhatsapp(true);
      } else {
        const savedName = String(
          profileData?.name || user.user_metadata?.name || ""
        ).trim();
        const savedWhatsapp = String(profileData?.whatsapp || "").trim();

        setProfileName(savedName);
        setWhatsapp(savedWhatsapp ? formatBRPhone(savedWhatsapp) : "");
        setNeedsWhatsapp(!savedWhatsapp);
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

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  return (
    <div className="min-h-screen bg-[var(--panel-bg)] text-[var(--panel-ink)]">
      <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-6">
        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-6 rounded-[1.35rem] border border-[var(--panel-line)] bg-[var(--panel-card)] p-4 shadow-[var(--panel-shadow)]">
            <div className="flex items-center justify-between">
              <Link
                href="/dashboard"
                className="relative block h-14 w-40 bg-contain bg-left bg-no-repeat"
                style={{ backgroundImage: "url('/logo.png?v=20260514')" }}
              >
                <span className="sr-only">PLPainel</span>
                <span className="absolute inset-0 -z-10 flex items-center text-xl font-black text-[var(--panel-ink)]">
                  PLPainel
                </span>
              </Link>
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-[var(--panel-line)] bg-[var(--panel-hover)] p-3">
              <div
                aria-label="Usuario"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-100 bg-cover bg-center text-base font-black text-emerald-700"
                style={{ backgroundImage: "url('/usuario.png?v=20260514')" }}
              >
                {(email || "P").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate font-black text-[var(--panel-ink)]">
                  {email || "Conta"}
                </div>
                <div className="truncate text-xs font-semibold text-[var(--panel-muted)]">
                  Conta verificada
                </div>
              </div>
            </div>

            <nav className="mt-5 space-y-1">
              {nav.map((item) => {
                const active = pathname === item.href;
                const external = item.href.startsWith("http");
                const className = [
                  "flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm font-bold transition",
                  active
                    ? "border-[var(--panel-nav-active-line)] bg-[var(--panel-nav-active-bg)] text-[var(--panel-nav-active-text)] shadow-sm"
                    : "border-transparent text-[var(--panel-nav-text)] hover:border-[var(--panel-line)] hover:bg-[var(--panel-hover)]",
                ].join(" ");

                const content = (
                  <>
                    <span className="grid h-7 w-7 place-items-center rounded-xl bg-[var(--panel-icon-bg)] text-sm">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </>
                );

                return (
                  <div key={item.href}>
                    {external ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className={className}
                      >
                        {content}
                      </a>
                    ) : (
                      <Link href={item.href} className={className}>
                        {content}
                      </Link>
                    )}

                    {item.href === "/sites/new" ? (
                      <details
                        className="group mt-1"
                        open={customDomainGroupActive}
                      >
                        <summary
                          className={[
                            "flex cursor-pointer list-none items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm font-bold transition",
                            customDomainGroupActive
                              ? "border-[var(--panel-nav-active-line)] bg-[var(--panel-nav-active-bg)] text-[var(--panel-nav-active-text)]"
                              : "border-transparent text-[var(--panel-nav-text)] hover:border-[var(--panel-line)] hover:bg-[var(--panel-hover)]",
                          ].join(" ")}
                        >
                          <span className="grid h-7 w-7 place-items-center rounded-xl bg-[var(--panel-icon-bg)] text-sm">
                            🔗
                          </span>
                          <span className="flex-1">Domínio Próprio</span>
                          <span className="text-xs text-[var(--panel-muted)] transition group-open:rotate-180">
                            ▾
                          </span>
                        </summary>

                        <div className="mt-1 space-y-1 pl-5">
                          {customDomainNav.map((domainItem) => {
                            const domainActive =
                              pathname === domainItem.href ||
                              pathname.startsWith(`${domainItem.href}/`);

                            return (
                              <Link
                                key={domainItem.href}
                                href={domainItem.href}
                                className={[
                                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition",
                                  domainActive
                                    ? "border-[var(--panel-nav-active-line)] bg-[var(--panel-nav-active-bg)] text-[var(--panel-nav-active-text)]"
                                    : "border-transparent text-[var(--panel-muted)] hover:bg-[var(--panel-hover)] hover:text-[var(--panel-ink)]",
                                ].join(" ")}
                              >
                                <span className="w-5 text-center text-xs">
                                  {domainItem.icon}
                                </span>
                                <span>{domainItem.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </details>
                    ) : null}
                  </div>
                );
              })}
            </nav>

            <button onClick={signOut} className="pl-btn mt-5 w-full">
              Sair
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="pl-btn"
              aria-label={
                theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"
              }
            >
              {theme === "dark" ? "Modo claro" : "Modo escuro"}
            </button>
            <Link href="/tokens" className="pl-btn pl-btn-primary">
              Comprar Tokens
            </Link>
            <a
              href={supportLink}
              target="_blank"
              rel="noopener noreferrer"
              className="pl-btn"
            >
              Falar com o suporte →
            </a>
          </div>

          {loading ? (
            <div className="pl-card p-6 text-[var(--panel-muted)]">
              Carregando painel...
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      {needsWhatsapp && (
        <div className="fixed inset-0 z-[999]">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="pl-card w-full max-w-md p-6">
              <div>
                <div className="text-lg font-black text-[var(--panel-ink)]">
                  Complete seu cadastro
                </div>
                <div className="mt-1 text-sm text-[var(--panel-muted)]">
                  Antes de continuar, preencha seu nome e WhatsApp.
                </div>
              </div>

              {whatsMsg && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {whatsMsg}
                </div>
              )}

              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="pl-label">Nome</span>
                  <input
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Seu nome"
                    className="pl-input"
                  />
                </label>

                <label className="block">
                  <span className="pl-label">WhatsApp</span>
                  <input
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(formatBRPhone(e.target.value))}
                    placeholder="(62) 99999-9999"
                    className="pl-input"
                    autoComplete="tel"
                  />
                </label>

                <button
                  onClick={saveWhatsapp}
                  disabled={savingWhatsapp}
                  className="pl-btn pl-btn-primary w-full disabled:opacity-60"
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
