"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type SiteRow = {
  id: string;
  slug: string | null;
  company_name: string | null;
  created_at?: string | null;
  base_domain?: string | null;
  domain_mode?: string | null;
  custom_domain?: string | null;
  is_public?: boolean | null;
  meta_verify_content?: string | null;
};

type AnnouncementRow = {
  id: string;
  title: string;
  content: string;
  is_published: boolean;
  created_at: string;
};

type AnnouncementViewRow = { announcement_id: string };
type MaintenanceSetting = { enabled?: boolean; message?: string };

export default function DashboardPage() {
  const supabase = useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    "Nosso sistema esta em manutencao temporaria. Algumas funcoes podem apresentar instabilidade."
  );
  const [showUpdatesModal, setShowUpdatesModal] = useState(false);
  const [unseenAnnouncements, setUnseenAnnouncements] = useState<AnnouncementRow[]>([]);
  const [markingViewed, setMarkingViewed] = useState(false);

  const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "plpainel.com";

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErrorMsg(null);

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!user || userErr) {
        if (!alive) return;
        setLoading(false);
        setSites([]);
        setErrorMsg("Usuario nao autenticado no dashboard.");
        return;
      }

      const [sitesRes, settingsRes, announcementsRes, viewsRes] =
        await Promise.all([
          supabase
            .from("sites")
            .select(
              "id, slug, company_name, created_at, base_domain, domain_mode, custom_domain, is_public, meta_verify_content"
            )
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("system_settings")
            .select("value")
            .eq("key", "maintenance_banner")
            .maybeSingle(),
          supabase
            .from("system_announcements")
            .select("id, title, content, is_published, created_at")
            .eq("is_published", true)
            .order("created_at", { ascending: false })
            .limit(20),
          supabase
            .from("user_announcement_views")
            .select("announcement_id")
            .eq("user_id", user.id),
        ]);

      if (!alive) return;

      if (sitesRes.error) {
        setSites([]);
        setErrorMsg(`Erro ao listar sites: ${sitesRes.error.message}`);
      } else {
        setSites((sitesRes.data as SiteRow[]) ?? []);
      }

      const maintenanceValue = settingsRes.data?.value as MaintenanceSetting | undefined;
      setMaintenanceEnabled(Boolean(maintenanceValue?.enabled));
      setMaintenanceMessage(
        maintenanceValue?.message ||
          "Nosso sistema esta em manutencao temporaria. Algumas funcoes podem apresentar instabilidade."
      );

      const allAnnouncements = (announcementsRes.data as AnnouncementRow[]) ?? [];
      const viewedIds = new Set(
        ((viewsRes.data as AnnouncementViewRow[]) ?? []).map((x) => x.announcement_id)
      );
      const unseen = allAnnouncements.filter((item) => !viewedIds.has(item.id));
      setUnseenAnnouncements(unseen);
      setShowUpdatesModal(unseen.length > 0);
      setLoading(false);
    }

    load();
    return () => {
      alive = false;
    };
  }, [supabase]);

  async function handleCloseUpdatesModal() {
    if (!unseenAnnouncements.length) {
      setShowUpdatesModal(false);
      return;
    }

    setMarkingViewed(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (user) {
        const payload = unseenAnnouncements.map((item) => ({
          user_id: user.id,
          announcement_id: item.id,
        }));

        await supabase.from("user_announcement_views").upsert(payload, {
          onConflict: "user_id,announcement_id",
          ignoreDuplicates: true,
        });
      }
    } finally {
      setMarkingViewed(false);
      setShowUpdatesModal(false);
    }
  }

  function getDisplayDomain(site: SiteRow) {
    const baseDomain = site.base_domain || ROOT_DOMAIN;
    const isCustomDomain =
      site.domain_mode === "custom_domain" && Boolean(site.custom_domain);

    return isCustomDomain
      ? String(site.custom_domain)
      : `${site.slug || "site"}.${baseDomain}`;
  }

  function getPublicUrl(site: SiteRow) {
    const isCustomDomain =
      site.domain_mode === "custom_domain" && Boolean(site.custom_domain);

    if (isCustomDomain) return `https://${site.custom_domain}`;
    if (process.env.NODE_ENV === "development") return `/s/${site.slug || "site"}`;
    return `https://${getDisplayDomain(site)}`;
  }

  const siteCards = sites.slice(0, 3);
  const activitySites = sites.slice(0, 4);
  const inboxDomains = sites
    .filter((site) => site.domain_mode === "custom_domain" && site.custom_domain)
    .slice(0, 3);

  return (
    <div className="pl-page space-y-6">
      {maintenanceEnabled ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
          <div className="font-bold">Manutencao temporaria</div>
          <div className="mt-1">{maintenanceMessage}</div>
        </div>
      ) : null}

      {errorMsg ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <section className="pl-card overflow-hidden p-0">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--panel-line)] p-5">
            <div>
              <h1 className="text-xl font-black">Meus Sites</h1>
              <p className="mt-1 text-sm text-[var(--panel-muted)]">
                Cards com status real e acoes mais diretas.
              </p>
            </div>
            <Link href="/sites" className="pl-btn">
              Ver todos
            </Link>
          </div>

          <div className="space-y-3 p-5">
            {loading ? (
              <div className="pl-card-soft text-sm font-semibold text-[var(--panel-muted)]">
                Carregando sites...
              </div>
            ) : siteCards.length === 0 ? (
              <div className="pl-card-soft text-sm font-semibold text-[var(--panel-muted)]">
                Nenhum site encontrado.
              </div>
            ) : (
              siteCards.map((site, index) => {
                const isCustomDomain =
                  site.domain_mode === "custom_domain" && Boolean(site.custom_domain);
                const publicUrl = getPublicUrl(site);

                return (
                  <article
                    key={site.id}
                    className="flex items-center gap-4 rounded-2xl border border-[var(--panel-line)] bg-[var(--panel-surface)] p-4"
                  >
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-violet-500 text-lg font-black text-white">
                      {(site.company_name || site.slug || `S${index + 1}`).slice(0, 1)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-black">
                        {site.company_name || site.slug || `Site ${index + 1}`}
                      </div>
                      <div className="mt-1 truncate text-sm text-[var(--panel-muted)]">
                        {getDisplayDomain(site)}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="pl-badge pl-badge-ok py-1 text-[11px]">
                          • {site.is_public === false ? "rascunho" : "publicado"}
                        </span>
                        {isCustomDomain ? (
                          <span className="pl-badge py-1 text-[11px]">
                            • dominio proprio
                          </span>
                        ) : null}
                        {site.meta_verify_content ? (
                          <span className="pl-badge py-1 text-[11px]">
                            • Meta Tag
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {process.env.NODE_ENV === "development" ? (
                      <Link href={publicUrl} target="_blank" className="pl-btn">
                        Abrir
                      </Link>
                    ) : (
                      <a href={publicUrl} target="_blank" rel="noreferrer" className="pl-btn">
                        Abrir
                      </a>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="pl-card overflow-hidden p-0">
          <div className="border-b border-[var(--panel-line)] p-5">
            <h2 className="text-xl font-black">Acoes rapidas</h2>
            <p className="mt-1 text-sm text-[var(--panel-muted)]">
              Atalhos para as tarefas mais usadas.
            </p>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-2">
            {[
              {
                href: "/sites/new",
                icon: "➕",
                title: "Criar site",
                text: "Gerar por CNPJ usando 1 token",
              },
              {
                href: "/sites/custom-domain",
                icon: "🔗",
                title: "Conectar dominio",
                text: "DNS, SSL e email guiados",
              },
              {
                href: "/tokens",
                icon: "💳",
                title: "Comprar tokens",
                text: "Recarregar saldo da conta",
              },
              {
                href: "/emails",
                icon: "✉",
                title: "Abrir inbox",
                text: "Ver mensagens recebidas",
              },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="rounded-2xl border border-[var(--panel-line)] bg-[var(--panel-hover)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--panel-nav-active-line)]"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--panel-icon-bg)]">
                  {action.icon}
                </span>
                <div className="mt-5 font-black">{action.title}</div>
                <div className="mt-1 text-sm text-[var(--panel-muted)]">{action.text}</div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="pl-card min-h-[330px] overflow-hidden p-0">
          <div className="border-b border-[var(--panel-line)] p-5">
            <h2 className="text-xl font-black">Atividade recente</h2>
            <p className="mt-1 text-sm text-[var(--panel-muted)]">
              Ultimas acoes importantes da conta.
            </p>
          </div>

          <div className="space-y-3 p-5">
            {loading ? (
              <div className="text-sm font-semibold text-[var(--panel-muted)]">
                Carregando atividades...
              </div>
            ) : activitySites.length === 0 ? (
              <div className="text-sm font-semibold text-[var(--panel-muted)]">
                Ainda nao ha atividade recente.
              </div>
            ) : (
              activitySites.map((site) => (
                <div
                  key={site.id}
                  className="flex items-center gap-3 rounded-2xl border border-[var(--panel-line)] bg-[var(--panel-surface)] p-3"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--panel-icon-bg)]">
                    ✓
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-black">
                      Site criado: {site.company_name || site.slug || "novo site"}
                    </div>
                    <div className="mt-1 truncate text-xs font-semibold text-[var(--panel-muted)]">
                      {getDisplayDomain(site)}
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-[var(--panel-muted)]">
                    {site.created_at
                      ? new Date(site.created_at).toLocaleDateString("pt-BR")
                      : "-"}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="pl-card min-h-[330px] overflow-hidden p-0">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--panel-line)] p-5">
            <div>
              <h2 className="text-xl font-black">Inbox interna</h2>
              <p className="mt-1 text-sm text-[var(--panel-muted)]">
                Emails com leitura rapida dentro do painel.
              </p>
            </div>
            <Link href="/emails" className="pl-btn">
              Abrir emails
            </Link>
          </div>

          <div className="space-y-2 p-5">
            {inboxDomains.length === 0 ? (
              <div className="text-sm font-semibold text-[var(--panel-muted)]">
                Conecte um dominio proprio para ativar a inbox interna.
              </div>
            ) : (
              inboxDomains.map((site, index) => {
                const domain = String(site.custom_domain);
                const address = `facebook@${domain}`;

                return (
                  <Link
                    key={site.id}
                    href={`/emails/${encodeURIComponent(domain)}`}
                    className="flex items-center gap-4 rounded-2xl border border-transparent p-3 transition hover:border-[var(--panel-line)] hover:bg-[var(--panel-hover)]"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--panel-icon-bg)]">
                      {index === 0 ? "✉" : index === 1 ? "⌁" : "⚠"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-black">{address}</span>
                      <span className="mt-1 block truncate text-sm text-[var(--panel-muted)]">
                        Caixa ativa para {domain}
                      </span>
                    </span>
                    <span className="pl-badge py-1 text-[11px]">abrir</span>
                  </Link>
                );
              })
            )}
          </div>
        </section>
      </div>

      {showUpdatesModal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="pl-card w-full max-w-2xl p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--panel-green-2)]">
              Atualizacoes
            </div>
            <h2 className="mt-2 text-2xl font-black">Novidades no sistema</h2>
            <p className="mt-1 text-sm text-[var(--panel-muted)]">
              Veja o que mudou desde seu ultimo acesso.
            </p>

            <div className="mt-6 max-h-[420px] space-y-4 overflow-y-auto pr-1">
              {unseenAnnouncements.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-[var(--panel-line)] bg-[var(--panel-hover)] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-base font-black">{item.title}</div>
                    <div className="text-xs text-[var(--panel-muted)]">
                      {new Date(item.created_at).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <div className="mt-3 whitespace-pre-line text-sm leading-7 text-[var(--panel-muted)]">
                    {item.content}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleCloseUpdatesModal}
                disabled={markingViewed}
                className="pl-btn pl-btn-primary disabled:opacity-60"
              >
                {markingViewed ? "Salvando..." : "Entendi"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
