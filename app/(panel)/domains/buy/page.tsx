"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

type DomainRow = {
  id: string;
  domain: string;
  status: string;
};

export default function BuyDomainPage() {
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setMsg(null);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;

    if (!user) {
      setMsg("Você precisa estar logado.");
      setLoading(false);
      return;
    }

    const { data: bal } = await supabase
      .from("domain_coin_balances")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    setBalance(bal?.balance ?? 0);

    const { data, error } = await supabase
      .from("available_domains")
      .select("id, domain, status")
      .eq("status", "available")
      .order("created_at", { ascending: false });

    if (error) {
      setMsg(error.message);
      setDomains([]);
    } else {
      setDomains(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function buyDomain(domainId: string) {
    setBuyingId(domainId);
    setMsg(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setMsg("Sessão inválida.");
      setBuyingId(null);
      return;
    }

    const res = await fetch("/api/domains/buy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ domainId }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json.ok) {
      setMsg(json.error || "Erro ao comprar domínio.");
      setBuyingId(null);
      return;
    }

    setMsg(`Domínio ${json.domain} comprado com sucesso!`);
    await load();
    setBuyingId(null);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 text-white">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h1 className="text-2xl font-bold">Comprar Domínio</h1>
        <p className="mt-1 text-sm text-white/60">
          Use 1 coin para comprar um domínio disponível.
        </p>

        <div className="mt-4 rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-3">
          <div className="text-sm text-white/60">Seu saldo</div>
          <div className="text-2xl font-bold">{balance} coin(s)</div>
        </div>
      </div>

      {msg && (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
          {msg}
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {loading ? (
          <div className="text-white/60">Carregando domínios...</div>
        ) : domains.length === 0 ? (
          <div className="text-white/60">Nenhum domínio disponível no momento.</div>
        ) : (
          domains.map((d) => (
            <div
              key={d.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <div className="text-lg font-bold">{d.domain}</div>
              <div className="mt-1 text-sm text-white/60">Custo: 1 coin</div>

              <button
                onClick={() => buyDomain(d.id)}
                disabled={buyingId === d.id || balance < 1}
                className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {buyingId === d.id ? "Comprando..." : "Comprar domínio"}
              </button>
            </div>
          ))
        )}
      </div>
    </main>
  );
}