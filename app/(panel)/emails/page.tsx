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
    <main className="mx-auto max-w-5xl px-4 py-8 text-white">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-bold">E-mails</h1>
        <p className="mt-1 text-sm text-white/60">
          Acesse a caixa de entrada dos domínios disponíveis e comprados.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {loading ? (
          <div className="text-white/60">Carregando...</div>
        ) : domains.length === 0 ? (
          <div className="text-white/60">Nenhum domínio disponível.</div>
        ) : (
          domains.map((d) => {
            const isGlobal = Boolean(d.is_global);

            const email = isGlobal
              ? `${mainSlug}@${d.domain}`
              : `facebook@${d.domain}`;

            return (
              <Link
                key={d.id}
                href={`/emails/${encodeURIComponent(d.domain)}`}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-bold">{d.domain}</div>

                    <div className="mt-1 text-xs text-white/50">
                      {isGlobal ? "Domínio global" : d.source === "custom" ? "Domínio próprio" : "Domínio comprado"}
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      isGlobal
                        ? "bg-violet-500/10 text-violet-200"
                        : "bg-emerald-500/10 text-emerald-200"
                    }`}
                  >
                    {isGlobal ? "Global" : "Seu"}
                  </span>
                </div>

                <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                  Use para verificação:{" "}
                  <span className="font-bold">{email}</span>
                </div>

                <div className="mt-3 text-sm text-white/60">
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
