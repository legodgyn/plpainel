"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

type DomainRow = {
  id: string;
  domain: string;
  status: string;
  assigned_at: string | null;
};

export default function MyDomainsPage() {
  const router = useRouter();
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;

    if (!user) {
      setDomains([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("available_domains")
      .select("id, domain, status, assigned_at")
      .eq("assigned_user_id", user.id)
      .order("assigned_at", { ascending: false });

    setDomains(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

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
              <span className="pl-badge pl-badge-ok">ativo</span>
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
                <button onClick={() => router.push("/emails")} className="pl-btn px-3 py-2 text-xs">
                  Emails
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </main>
  );
}
