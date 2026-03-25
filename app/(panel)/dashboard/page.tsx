"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type SiteRow = {
  id: string;
  slug: string;
  company_name: string | null;
  created_at?: string | null;
  base_domain?: string | null;
};

type TokenRow = {
  balance: number | null;
};

type AnnouncementRow = {
  id: string;
  title: string;
  content: string;
  is_published: boolean;
  created_at: string;
};

type AnnouncementViewRow = {
  announcement_id: string;
};

type MaintenanceSetting = {
  enabled?: boolean;
  message?: string;
};

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

      const tokenPromise = supabase
        .from("user_token_balances")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle<TokenRow>();

      const sitesPromise = supabase
        .from("sites")
        .select("id, slug, company_name, created_at, base_domain")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      const settingsPromise = supabase
        .from("system_settings")
        .select("value")
        .eq("key", "maintenance_banner")
        .maybeSingle();

      const announcementsPromise = supabase
        .from("system_announcements")
        .select("id, title, content, is_published, created_at")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(20);

      const viewsPromise = supabase
        .from("user_announcement_views")
        .select("announcement_id")
        .eq("user_id", user.id);

      const [tokenRes, sitesRes, settingsRes, announcementsRes, viewsRes] =
        await Promise.all([
          tokenPromise,
          sitesPromise,
          settingsPromise,
          announcementsPromise,
          viewsPromise,
        ]);

      if (!alive) return;

      if (tokenRes.error) {
        setBalance(0);
      } else {
        setBalance(tokenRes.data?.balance ?? 0);
      }

      if (sitesRes.error) {
        setSites([]);
        setErrorMsg((prev) => prev ?? `Erro ao listar sites: ${sitesRes.error.message}`);
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
    <div className="space-y-6 text-white">
      {maintenanceEnabled ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
          <div className="font-semibold">⚠️ Manutenção temporária</div>
          <div className="mt-1 text-amber-100/85">{maintenanceMessage}</div>
        </div>
      ) : null}

      {errorMsg ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMsg}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_10px_30px_rgba(0,0,0,.35)]">
          <div className="text-sm font-semibold text-white">⚡ Tokens disponíveis</div>

          <div className="mt-2 text-4xl font-bold tracking-tight text-white">
            {loading ? "—" : balance ?? 0}
          </div>

          <div className="mt-2 text-xs text-white/60">
            (Você ainda pode criar {loading ? "—" : balance ?? 0} Sites)
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_10px_30px_rgba(0,0,0,.35)]">
          <div className="text-sm font-semibold text-white">🚀 Criar Novo Site</div>
          <div className="mt-1 text-sm text-white/60">Gere seu site em segundos.</div>

          <div className="mt-4">
            <Link
              href="/sites/new"
              className="inline-flex items-center justify-center rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500"
            >
              + Criar Novo Site
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_10px_30px_rgba(0,0,0,.35)]">
          <div className="text-sm font-semibold text-white">🌐 Meus Sites</div>
          <div className="mt-1 text-sm text-white/60">Veja todos os sites criados.</div>

          <div className="mt-4">
            <Link
              href="/sites"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Abrir lista
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_10px_30px_rgba(0,0,0,.35)]">
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold text-white">Histórico de Sites</div>

          <Link href="/sites" className="text-sm font-semibold text-purple-200 hover:text-purple-100">
            Ver todos →
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-white/70">
              <tr className="border-b border-white/10">
                <th className="py-3 text-left font-semibold">Slug</th>
                <th className="py-3 text-left font-semibold">Criado</th>
                <th className="py-3 text-left font-semibold">Domínio</th>
                <th className="py-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td className="py-4 text-white/60" colSpan={4}>
                    Carregando…
                  </td>
                </tr>
              ) : sites.length === 0 ? (
                <tr>
                  <td className="py-4 text-white/60" colSpan={4}>
                    Nenhum site ainda.
                  </td>
                </tr>
              ) : (
                sites.map((s) => {
                  const baseDomain = s.base_domain || ROOT_DOMAIN;
                  const publicUrl =
                    process.env.NODE_ENV === "development"
                      ? `/s/${s.slug}`
                      : `https://${s.slug}.${baseDomain}`;

                  return (
                    <tr key={s.id} className="hover:bg-white/5">
                      <td className="py-3 font-semibold text-white">{s.slug}</td>

                      <td className="py-3 text-white/70">
                        {s.created_at ? new Date(s.created_at).toLocaleString("pt-BR") : "—"}
                      </td>

                      <td className="py-3 text-white/70">{`${s.slug}.${baseDomain}`}</td>

                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/sites/${s.id}/edit`}
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
                          >
                            Editar
                          </Link>

                          {process.env.NODE_ENV === "development" ? (
                            <Link
                              href={publicUrl}
                              target="_blank"
                              className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/15"
                            >
                              Abrir
                            </Link>
                          ) : (
                            <a
                              href={publicUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/15"
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0b0b14] p-6 shadow-[0_20px_80px_rgba(0,0,0,.45)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300">
                  Atualizações
                </div>
                <h2 className="mt-2 text-2xl font-bold text-white">
                  Novidades no sistema
                </h2>
                <p className="mt-1 text-sm text-white/60">
                  Veja o que mudou desde seu último acesso.
                </p>
              </div>
            </div>

            <div className="mt-6 max-h-[420px] space-y-4 overflow-y-auto pr-1">
              {unseenAnnouncements.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-base font-semibold text-white">
                      {item.title}
                    </div>
                    <div className="text-xs text-white/45">
                      {new Date(item.created_at).toLocaleDateString("pt-BR")}
                    </div>
                  </div>

                  <div className="mt-3 whitespace-pre-line text-sm leading-7 text-white/75">
                    {item.content}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleCloseUpdatesModal}
                disabled={markingViewed}
                className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-60"
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
