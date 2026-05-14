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
};

type TokenRow = { balance: number | null };

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
  const [balance, setBalance] = useState<number | null>(null);
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    "Nosso sistema está em manutenção temporária. Algumas funções podem apresentar instabilidade."
  );
  const [showUpdatesModal, setShowUpdatesModal] = useState(false);
  const [unseenAnnouncements, setUnseenAnnouncements] = useState<AnnouncementRow[]>([]);
  const [markingViewed, setMarkingViewed] = useState(false);

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
        setBalance(null);
        setSites([]);
        setErrorMsg("Usuário não autenticado no dashboard.");
        return;
      }

      const [tokenRes, sitesRes, settingsRes, announcementsRes, viewsRes] =
        await Promise.all([
          supabase
            .from("user_token_balances")
            .select("balance")
            .eq("user_id", user.id)
            .maybeSingle<TokenRow>(),
          supabase
            .from("sites")
            .select("id, slug, company_name, created_at, base_domain, domain_mode, custom_domain")
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

      setBalance(tokenRes.error ? 0 : tokenRes.data?.balance ?? 0);

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
          "Nosso sistema está em manutenção temporária. Algumas funções podem apresentar instabilidade."
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

  const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "plpainel.com";

  return (
    <div className="pl-page space-y-6">
      {maintenanceEnabled ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
          <div className="font-bold">Manutenção temporária</div>
          <div className="mt-1">{maintenanceMessage}</div>
        </div>
      ) : null}

      {errorMsg ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      ) : null}

      <div className="pl-page-title">
        <div>
          <h1>Dashboard</h1>
          <p>Resumo da conta, ações rápidas, sites recentes e inbox interna.</p>
        </div>
        <Link href="/tokens" className="pl-btn pl-btn-primary">
          Comprar Tokens
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="pl-card p-5">
          <div className="text-sm font-black">Tokens disponíveis</div>
          <div className="mt-2 text-4xl font-black">{loading ? "-" : balance ?? 0}</div>
          <div className="mt-2 text-xs text-[var(--panel-muted)]">
            Você ainda pode criar {loading ? "-" : balance ?? 0} sites.
          </div>
        </div>

        <div className="pl-card p-5">
          <div className="text-sm font-black">Criar Novo Site</div>
          <div className="mt-1 text-sm text-[var(--panel-muted)]">
            Gere seu site em segundos.
          </div>
          <div className="mt-4">
            <Link href="/sites/new" className="pl-btn pl-btn-primary">
              Criar Novo Site
            </Link>
          </div>
        </div>

        <div className="pl-card p-5">
          <div className="text-sm font-black">Meus Sites</div>
          <div className="mt-1 text-sm text-[var(--panel-muted)]">
            Veja todos os sites criados.
          </div>
          <div className="mt-4">
            <Link href="/sites" className="pl-btn">
              Abrir lista
            </Link>
          </div>
        </div>
      </div>

      <div className="pl-card p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-base font-black">Histórico de Sites</div>
            <div className="mt-1 text-sm text-[var(--panel-muted)]">
              Últimos sites criados na conta.
            </div>
          </div>
          <Link href="/sites" className="pl-btn">
            Ver todos →
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="pl-table">
            <thead>
              <tr>
                <th>Site</th>
                <th>Criado</th>
                <th>Domínio</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="py-4 text-[var(--panel-muted)]" colSpan={4}>
                    Carregando...
                  </td>
                </tr>
              ) : sites.length === 0 ? (
                <tr>
                  <td className="py-4 text-[var(--panel-muted)]" colSpan={4}>
                    Nenhum site ainda.
                  </td>
                </tr>
              ) : (
                sites.map((s) => {
                  const baseDomain = s.base_domain || ROOT_DOMAIN;
                  const isCustomDomain =
                    s.domain_mode === "custom_domain" && Boolean(s.custom_domain);
                  const displayDomain = isCustomDomain
                    ? String(s.custom_domain)
                    : `${s.slug || "site"}.${baseDomain}`;
                  const publicUrl = isCustomDomain
                    ? `https://${s.custom_domain}`
                    : process.env.NODE_ENV === "development"
                    ? `/s/${s.slug || "site"}`
                    : `https://${s.slug || "site"}.${baseDomain}`;

                  return (
                    <tr key={s.id} className="hover:bg-[#f8fbfa]">
                      <td className="font-semibold">
                        {isCustomDomain ? "Domínio próprio" : s.company_name || s.slug}
                      </td>
                      <td className="text-[var(--panel-muted)]">
                        {s.created_at
                          ? new Date(s.created_at).toLocaleString("pt-BR")
                          : "-"}
                      </td>
                      <td className="text-[var(--panel-muted)]">{displayDomain}</td>
                      <td className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Link
                            href={`/sites/${s.id}/edit`}
                            className="pl-btn px-3 py-1.5 text-xs"
                          >
                            Editar
                          </Link>
                          {process.env.NODE_ENV === "development" ? (
                            <Link
                              href={publicUrl}
                              target="_blank"
                              className="pl-btn pl-btn-primary px-3 py-1.5 text-xs"
                            >
                              Abrir
                            </Link>
                          ) : (
                            <a
                              href={publicUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="pl-btn pl-btn-primary px-3 py-1.5 text-xs"
                            >
                              Abrir
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showUpdatesModal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="pl-card w-full max-w-2xl p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--panel-green-2)]">
              Atualizações
            </div>
            <h2 className="mt-2 text-2xl font-black">Novidades no sistema</h2>
            <p className="mt-1 text-sm text-[var(--panel-muted)]">
              Veja o que mudou desde seu último acesso.
            </p>

            <div className="mt-6 max-h-[420px] space-y-4 overflow-y-auto pr-1">
              {unseenAnnouncements.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-[var(--panel-line)] bg-[#f8fbfa] p-4"
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
