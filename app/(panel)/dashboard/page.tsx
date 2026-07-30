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

type TokenBalanceRow = { balance: number | null };

type OrderRow = {
  id: string;
  tokens: number | null;
  total_cents: number | null;
  status: string | null;
  mp_status: string | null;
  created_at: string | null;
  mp_payment_id: string | null;
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

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function fmtDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("pt-BR");
  } catch {
    return value;
  }
}

function fmtDay(value: Date) {
  return value.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function dateKey(value: Date) {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeOrderStatus(order: OrderRow) {
  const status = String(order.status || "").toLowerCase();
  const mpStatus = String(order.mp_status || "").toLowerCase();
  if ([status, mpStatus].some((value) => value === "paid" || value === "approved")) return "paid";
  if ([status, mpStatus].some((value) => value === "pending" || value === "in_process")) return "pending";
  if ([status, mpStatus].some((value) => ["failed", "rejected", "canceled", "cancelled", "expired"].includes(value))) {
    return "failed";
  }
  return status || mpStatus || "unknown";
}

function orderStatusLabel(status: string) {
  if (status === "paid") return "Pago";
  if (status === "pending") return "Pendente";
  if (status === "failed") return "Falhou";
  return status || "-";
}

export default function DashboardPage() {
  const supabase = useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);
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
        setOrders([]);
        setErrorMsg("Usuario nao autenticado no dashboard.");
        return;
      }

      const [sitesRes, tokenRes, ordersRes, settingsRes, announcementsRes, viewsRes] =
        await Promise.all([
          supabase
            .from("sites")
            .select(
              "id, slug, company_name, created_at, base_domain, domain_mode, custom_domain, is_public, meta_verify_content"
            )
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(500),
          supabase
            .from("user_token_balances")
            .select("balance")
            .eq("user_id", user.id)
            .maybeSingle<TokenBalanceRow>(),
          supabase
            .from("token_orders")
            .select("id, tokens, total_cents, status, mp_status, created_at, mp_payment_id")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(30),
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

      setTokenBalance(tokenRes.error ? 0 : tokenRes.data?.balance ?? 0);
      setOrders(ordersRes.error ? [] : ((ordersRes.data as OrderRow[]) ?? []));

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

  async function copyDomain(domain: string) {
    await navigator.clipboard.writeText(domain);
    setCopiedDomain(domain);
    window.setTimeout(() => setCopiedDomain(null), 1800);
  }

  const metrics = useMemo(() => {
    const published = sites.filter((site) => site.is_public !== false).length;
    const customDomains = sites.filter(
      (site) => site.domain_mode === "custom_domain" && site.custom_domain
    ).length;
    const metaTags = sites.filter((site) => site.meta_verify_content).length;
    const paidOrders = orders.filter((order) => normalizeOrderStatus(order) === "paid");
    const pendingOrders = orders.filter((order) => normalizeOrderStatus(order) === "pending");
    const recentPaidCents = paidOrders.reduce((sum, order) => sum + Number(order.total_cents || 0), 0);

    return {
      totalSites: sites.length,
      published,
      drafts: Math.max(0, sites.length - published),
      customDomains,
      metaTags,
      paidOrders: paidOrders.length,
      pendingOrders: pendingOrders.length,
      recentPaidCents,
    };
  }, [orders, sites]);

  const creationChart = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (13 - index));
      return {
        key: dateKey(date),
        label: fmtDay(date),
        count: 0,
      };
    });
    const byKey = new Map(days.map((day) => [day.key, day]));

    for (const site of sites) {
      if (!site.created_at) continue;
      const created = new Date(site.created_at);
      const item = byKey.get(dateKey(created));
      if (item) item.count += 1;
    }

    const max = Math.max(1, ...days.map((day) => day.count));
    return days.map((day) => ({
      ...day,
      height: Math.max(day.count ? 14 : 4, Math.round((day.count / max) * 100)),
    }));
  }, [sites]);

  const domainsChart = useMemo(() => {
    const counts = new Map<string, number>();

    for (const site of sites) {
      const label =
        site.domain_mode === "custom_domain" && site.custom_domain
          ? "dominio proprio"
          : site.base_domain || ROOT_DOMAIN;
      counts.set(label, (counts.get(label) || 0) + 1);
    }

    const rows = Array.from(counts.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const max = Math.max(1, ...rows.map((row) => row.count));
    return rows.map((row) => ({
      ...row,
      width: Math.max(8, Math.round((row.count / max) * 100)),
    }));
  }, [ROOT_DOMAIN, sites]);

  const attentionItems = useMemo(() => {
    const items: Array<{ title: string; text: string; href: string; tone: "ok" | "warn" | "danger" }> = [];
    const withoutMeta = sites.filter((site) => !site.meta_verify_content).length;

    if (tokenBalance <= 0) {
      items.push({
        title: "Saldo zerado",
        text: "Compre tokens para criar novos sites.",
        href: "/tokens",
        tone: "danger",
      });
    } else if (tokenBalance < 5) {
      items.push({
        title: "Saldo baixo",
        text: `${tokenBalance} token(s) disponiveis.`,
        href: "/tokens",
        tone: "warn",
      });
    }

    if (sites.length === 0) {
      items.push({
        title: "Nenhum site criado",
        text: "Comece criando um site por CNPJ.",
        href: "/sites/new",
        tone: "warn",
      });
    }

    if (withoutMeta > 0) {
      items.push({
        title: "Meta Tag pendente",
        text: `${withoutMeta} site(s) sem meta verificacao.`,
        href: "/sites",
        tone: "warn",
      });
    }

    if (metrics.customDomains === 0 && sites.length > 0) {
      items.push({
        title: "Dominio proprio",
        text: "Conecte um dominio proprio para reforcar sua marca.",
        href: "/sites/custom-domain",
        tone: "ok",
      });
    }

    if (metrics.pendingOrders > 0) {
      items.push({
        title: "PIX pendente",
        text: `${metrics.pendingOrders} compra(s) aguardando pagamento.`,
        href: "/billing",
        tone: "warn",
      });
    }

    if (items.length === 0) {
      items.push({
        title: "Operacao em dia",
        text: "Sem pendencias importantes agora.",
        href: "/sites",
        tone: "ok",
      });
    }

    return items.slice(0, 4);
  }, [metrics.customDomains, metrics.pendingOrders, sites, tokenBalance]);

  const siteCards = sites.slice(0, 5);
  const recentOrders = orders.slice(0, 5);

  return (
    <div className="pl-page space-y-6">
      {maintenanceEnabled ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
          <div className="font-bold">Manutencao temporaria</div>
          <div className="mt-1">{maintenanceMessage}</div>
        </div>
      ) : null}

      {copiedDomain ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          Dominio copiado: {copiedDomain}
        </div>
      ) : null}

      {errorMsg ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      ) : null}

      <div className="pl-page-title">
        <div>
          <span className="pl-badge">Minha conta</span>
          <h1>Meu Dashboard</h1>
          <p>Resumo individual dos seus sites, tokens, dominios e compras.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/sites/new" className="pl-btn pl-btn-primary">
            Criar site
          </Link>
          <Link href="/sites/custom-domain" className="pl-btn">
            Conectar dominio
          </Link>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Tokens", value: tokenBalance, hint: "disponiveis para criar sites" },
          { label: "Sites", value: metrics.totalSites, hint: `${metrics.published} publicados` },
          { label: "Dominios proprios", value: metrics.customDomains, hint: "conectados aos sites" },
          { label: "Meta tags", value: metrics.metaTags, hint: "sites com verificacao" },
        ].map((card) => (
          <div key={card.label} className="pl-card-soft">
            <div className="text-sm font-bold text-[var(--panel-muted)]">{card.label}</div>
            <div className="mt-2 text-3xl font-black text-[var(--panel-ink)]">
              {loading ? "-" : card.value}
            </div>
            <div className="mt-1 text-xs font-semibold text-[var(--panel-muted)]">{card.hint}</div>
          </div>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <section className="pl-card overflow-hidden p-0">
          <div className="border-b border-[var(--panel-line)] p-5">
            <h2 className="text-xl font-black">Meus sites criados</h2>
            <p className="mt-1 text-sm text-[var(--panel-muted)]">Sua atividade nos ultimos 14 dias.</p>
          </div>

          <div className="p-5">
            <div className="flex h-56 items-end gap-2 rounded-2xl border border-[var(--panel-line)] bg-[var(--panel-hover)] px-4 pb-4 pt-6">
              {creationChart.map((day) => (
                <div key={day.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="flex h-40 w-full items-end justify-center">
                    <div
                      className="w-full max-w-8 rounded-t-xl bg-[var(--panel-green-2)]"
                      style={{ height: `${day.height}%`, opacity: day.count ? 1 : 0.25 }}
                      title={`${day.label}: ${day.count}`}
                    />
                  </div>
                  <div className="text-[10px] font-bold text-[var(--panel-muted)]">{day.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="pl-card overflow-hidden p-0">
          <div className="border-b border-[var(--panel-line)] p-5">
            <h2 className="text-xl font-black">Proximos passos</h2>
            <p className="mt-1 text-sm text-[var(--panel-muted)]">Acoes recomendadas para a sua conta.</p>
          </div>

          <div className="space-y-3 p-5">
            {attentionItems.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="block rounded-2xl border border-[var(--panel-line)] bg-[var(--panel-surface)] p-4 transition hover:border-[var(--panel-nav-active-line)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-black">{item.title}</div>
                    <div className="mt-1 text-sm text-[var(--panel-muted)]">{item.text}</div>
                  </div>
                  <span
                    className={
                      item.tone === "danger"
                        ? "pl-badge pl-badge-danger"
                        : item.tone === "warn"
                        ? "pl-badge pl-badge-warn"
                        : "pl-badge pl-badge-ok"
                    }
                  >
                    abrir
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <section className="pl-card overflow-hidden p-0">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--panel-line)] p-5">
            <div>
              <h2 className="text-xl font-black">Sites recentes</h2>
              <p className="mt-1 text-sm text-[var(--panel-muted)]">Seus sites com acesso rapido para abrir, editar e copiar dominio.</p>
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
                const domain = getDisplayDomain(site);

                return (
                  <article
                    key={site.id}
                    className="rounded-2xl border border-[var(--panel-line)] bg-[var(--panel-surface)] p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-violet-500 text-lg font-black text-white">
                        {(site.company_name || site.slug || `S${index + 1}`).slice(0, 1)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-black">
                          {site.company_name || site.slug || `Site ${index + 1}`}
                        </div>
                        <div className="mt-1 truncate text-sm text-[var(--panel-muted)]">{domain}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className={site.is_public === false ? "pl-badge pl-badge-warn py-1 text-[11px]" : "pl-badge pl-badge-ok py-1 text-[11px]"}>
                            {site.is_public === false ? "rascunho" : "publicado"}
                          </span>
                          {isCustomDomain ? (
                            <span className="pl-badge py-1 text-[11px]">dominio proprio</span>
                          ) : null}
                          {site.meta_verify_content ? (
                            <span className="pl-badge py-1 text-[11px]">Meta Tag</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {process.env.NODE_ENV === "development" ? (
                        <Link href={publicUrl} target="_blank" className="pl-btn py-2 text-xs">
                          Abrir
                        </Link>
                      ) : (
                        <a href={publicUrl} target="_blank" rel="noreferrer" className="pl-btn py-2 text-xs">
                          Abrir
                        </a>
                      )}
                      <Link href={`/sites/${site.id}/edit`} className="pl-btn py-2 text-xs">
                        Editar
                      </Link>
                      <button type="button" onClick={() => copyDomain(domain)} className="pl-btn py-2 text-xs">
                        Copiar dominio
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="pl-card overflow-hidden p-0">
          <div className="border-b border-[var(--panel-line)] p-5">
            <h2 className="text-xl font-black">Meus dominios</h2>
            <p className="mt-1 text-sm text-[var(--panel-muted)]">Onde os seus sites estao publicados.</p>
          </div>

          <div className="space-y-4 p-5">
            {domainsChart.length === 0 ? (
              <div className="text-sm font-semibold text-[var(--panel-muted)]">Sem sites para agrupar.</div>
            ) : (
              domainsChart.map((item) => (
                <div key={item.domain}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-black">{item.domain}</span>
                    <span className="font-bold text-[var(--panel-muted)]">{item.count}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-[var(--panel-hover)]">
                    <div className="h-full rounded-full bg-[var(--panel-green-2)]" style={{ width: `${item.width}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-5">
        <section className="pl-card min-h-[330px] overflow-hidden p-0">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--panel-line)] p-5">
            <div>
              <h2 className="text-xl font-black">Minhas compras recentes</h2>
              <p className="mt-1 text-sm text-[var(--panel-muted)]">
                {metrics.recentPaidCents ? `${money(metrics.recentPaidCents)} pagos recentemente.` : "Historico de tokens."}
              </p>
            </div>
            <Link href="/billing" className="pl-btn">
              Ver compras
            </Link>
          </div>

          <div className="space-y-3 p-5">
            {recentOrders.length === 0 ? (
              <div className="text-sm font-semibold text-[var(--panel-muted)]">Nenhuma compra registrada.</div>
            ) : (
              recentOrders.map((order) => {
                const status = normalizeOrderStatus(order);
                return (
                  <div key={order.id} className="rounded-2xl border border-[var(--panel-line)] bg-[var(--panel-surface)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-black">{Number(order.tokens || 0)} tokens</div>
                        <div className="mt-1 text-sm text-[var(--panel-muted)]">
                          {money(Number(order.total_cents || 0))} | {fmtDate(order.created_at)}
                        </div>
                      </div>
                      <span
                        className={
                          status === "paid"
                            ? "pl-badge pl-badge-ok"
                            : status === "pending"
                            ? "pl-badge pl-badge-warn"
                            : "pl-badge pl-badge-danger"
                        }
                      >
                        {orderStatusLabel(status)}
                      </span>
                    </div>
                  </div>
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
