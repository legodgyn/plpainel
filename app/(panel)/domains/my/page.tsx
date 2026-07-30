"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

type DomainRow = {
  id: string;
  domain: string;
  status: string;
  assigned_at: string | null;
  source: "available" | "connected";
};

export default function MyDomainsPage() {
  const router = useRouter();
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingDomain, setRemovingDomain] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load(options?: { clearMessage?: boolean }) {
    setLoading(true);
    if (options?.clearMessage !== false) setMsg(null);
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;

    if (!user) {
      setDomains([]);
      setLoading(false);
      return;
    }

    const { data: availableDomains } = await supabase
      .from("available_domains")
      .select("id, domain, status, assigned_at")
      .eq("assigned_user_id", user.id)
      .order("assigned_at", { ascending: false });

    const { data: connectedSites } = await supabase
      .from("sites")
      .select("id, custom_domain, created_at")
      .eq("user_id", user.id)
      .eq("domain_mode", "custom_domain")
      .not("custom_domain", "is", null)
      .order("created_at", { ascending: false });

    const rows = new Map<string, DomainRow>();

    for (const row of availableDomains || []) {
      const domain = String(row.domain || "").trim().toLowerCase();
      if (!domain) continue;
      rows.set(domain, {
        id: row.id,
        domain,
        status: row.status || "ativo",
        assigned_at: row.assigned_at || null,
        source: "available",
      });
    }

    for (const row of connectedSites || []) {
      const domain = String(row.custom_domain || "").trim().toLowerCase();
      if (!domain || rows.has(domain)) continue;
      rows.set(domain, {
        id: row.id,
        domain,
        status: "conectado",
        assigned_at: row.created_at || null,
        source: "connected",
      });
    }

    setDomains([...rows.values()]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function removeDomain(row: DomainRow) {
    const ok = window.confirm(
      `Remover ${row.domain} da sua conta?\n\nOs sites que usam esse domínio voltarão para o domínio padrão da plataforma. Nenhum site será apagado.`
    );

    if (!ok) return;

    setRemovingDomain(row.domain);
    setMsg(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/domains/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ domain: row.domain }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        setMsg(json.error || "Nao foi possivel remover o dominio.");
        return;
      }

      setMsg(
        json.affectedSites
          ? `Dominio removido. ${json.affectedSites} site(s) voltaram para o dominio padrao.`
          : "Dominio removido da sua conta."
      );
      await load({ clearMessage: false });
    } finally {
      setRemovingDomain(null);
    }
  }

  return (
    <main className="pl-page max-w-6xl space-y-6">
      <div className="pl-page-title">
        <div>
          <h1>Meus Domínios</h1>
          <p>Veja os domínios comprados ou conectados na sua conta.</p>
        </div>
        <button onClick={() => router.push("/sites/custom-domain")} className="pl-btn pl-btn-primary">
          Conectar domínio próprio
        </button>
      </div>

      {msg ? (
        <div className="rounded-xl border border-[var(--panel-line)] bg-[var(--panel-hover)] px-4 py-3 text-sm font-semibold text-[var(--panel-ink)]">
          {msg}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <div className="pl-card p-5 text-[var(--panel-muted)]">Carregando...</div>
        ) : domains.length === 0 ? (
          <div className="pl-card p-6 text-[var(--panel-muted)] md:col-span-2 xl:col-span-3">
            Você ainda não comprou nenhum domínio.
          </div>
        ) : (
          domains.map((d) => (
            <article key={d.id} className="pl-card p-5">
              <span className="pl-badge pl-badge-ok">
                {d.source === "connected" ? "conectado" : "ativo"}
              </span>
              <h2 className="mt-3 break-all text-xl font-black">{d.domain}</h2>
              <p className="mt-2 text-sm text-[var(--panel-muted)]">
                Status: <strong>{d.status}</strong>
              </p>
              <p className="mt-1 text-xs text-[var(--panel-muted)]">
                Adicionado em {d.assigned_at ? new Date(d.assigned_at).toLocaleDateString("pt-BR") : "-"}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button onClick={() => router.push("/sites/domain-subdomain")} className="pl-btn px-3 py-2 text-xs">
                  Criar subdomínio
                </button>
                <button
                  type="button"
                  onClick={() => removeDomain(d)}
                  disabled={removingDomain === d.domain}
                  className="pl-btn pl-btn-danger px-3 py-2 text-xs disabled:opacity-60"
                >
                  {removingDomain === d.domain ? "Removendo..." : "Remover"}
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </main>
  );
}
