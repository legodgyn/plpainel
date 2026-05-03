"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

type DomainRow = {
  id: string;
  domain: string;
  status: string;
};

export default function EmailsPage() {
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;

      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("available_domains")
        .select("id, domain, status")
        .eq("assigned_user_id", user.id)
        .in("status", ["sold", "used"])
        .order("assigned_at", { ascending: false });

      setDomains(data || []);
      setLoading(false);
    }

    load();
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 text-white">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-bold">E-mails</h1>
        <p className="mt-1 text-sm text-white/60">
          Acesse a caixa de entrada de cada domínio comprado.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {loading ? (
          <div className="text-white/60">Carregando...</div>
        ) : domains.length === 0 ? (
          <div className="text-white/60">Você ainda não possui domínios.</div>
        ) : (
          domains.map((d) => {
            const email = `facebook@${d.domain}`;

            return (
              <Link
                key={d.id}
                href={`/emails/${encodeURIComponent(d.domain)}`}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10"
              >
                <div className="text-lg font-bold">{d.domain}</div>

                <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
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
