"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

type DomainRow = {
  id: string;
  domain: string;
  status: string;
  assigned_at: string | null;
};

export default function MyDomainsPage() {
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
    <main className="mx-auto max-w-5xl px-4 py-8 text-white">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h1 className="text-2xl font-bold">Meus Domínios</h1>
        <p className="mt-1 text-sm text-white/60">
          Veja os domínios que você comprou.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {loading ? (
          <div className="text-white/60">Carregando...</div>
        ) : domains.length === 0 ? (
          <div className="text-white/60">Você ainda não comprou nenhum domínio.</div>
        ) : (
          domains.map((d) => (
            <div key={d.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-lg font-bold">{d.domain}</div>
              <div className="mt-2 text-sm text-white/60">
                Status:{" "}
                <span className="font-semibold text-emerald-300">{d.status}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}