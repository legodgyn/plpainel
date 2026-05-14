"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

type DomainRow = {
  id: string;
  domain: string;
  status: string;
  is_global?: boolean | null;
  source?: "available" | "custom";
};

export default function EmailsPage() {
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [mainSlug, setMainSlug] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: sites } = await supabase
        .from("sites")
        .select("slug")
        .eq("user_id", user.id)
        .not("slug", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);

      const slug = sites?.[0]?.slug || "facebook";
      setMainSlug(slug);

      const { data } = await supabase
        .from("available_domains")
        .select("id, domain, status, is_global")
        .or(`assigned_user_id.eq.${user.id},is_global.eq.true`)
        .order("domain", { ascending: true });

      const { data: customSites } = await supabase
        .from("sites")
        .select("id, custom_domain")
        .eq("user_id", user.id)
        .eq("domain_mode", "custom_domain")
        .not("custom_domain", "is", null)
        .order("created_at", { ascending: false });

      const customDomains: DomainRow[] = (customSites || []).map((site) => ({
        id: `custom-${site.id}`,
        domain: site.custom_domain as string,
        status: "used",
        is_global: false,
        source: "custom",
      }));

      const merged = [...((data || []) as DomainRow[]), ...customDomains].filter(
        (item, index, arr) => arr.findIndex((x) => x.domain === item.domain) === index
      );

      setDomains(merged);
      setLoading(false);
    }

    load();
  }, []);

  return (
    <main className="pl-page max-w-6xl space-y-6">
      <div className="pl-page-title">
        <div>
          <h1>Emails</h1>
          <p>Acesse caixas internas dos domínios disponíveis, comprados e conectados.</p>
        </div>
        <span className="pl-badge pl-badge-ok">{domains.length} domínios</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {loading ? (
          <div className="pl-card p-5 text-[var(--panel-muted)]">Carregando...</div>
        ) : domains.length === 0 ? (
          <div className="pl-card p-6 text-[var(--panel-muted)] md:col-span-2">
            Nenhum domínio disponível.
          </div>
        ) : (
          domains.map((d) => {
            const isGlobal = Boolean(d.is_global);
            const email = isGlobal ? `${mainSlug}@${d.domain}` : `facebook@${d.domain}`;

            return (
              <Link
                key={d.id}
                href={`/emails/${encodeURIComponent(d.domain)}`}
                className="pl-card p-5 transition hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="break-all text-lg font-black">{d.domain}</div>
                    <div className="mt-1 text-xs text-[var(--panel-muted)]">
                      {isGlobal ? "Domínio global" : d.source === "custom" ? "Domínio próprio" : "Domínio comprado"}
                    </div>
                  </div>
                  <span className={isGlobal ? "pl-badge" : "pl-badge pl-badge-ok"}>
                    {isGlobal ? "Global" : "Seu"}
                  </span>
                </div>

                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  Use para verificação: <span className="font-black">{email}</span>
                </div>

                <div className="mt-3 text-sm font-bold text-[var(--panel-green-2)]">
                  Abrir caixa de entrada →
                </div>
              </Link>
            );
          })
        )}
      </div>
    </main>
  );
}
