"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type SiteRow = {
  id: string;
  slug: string;
  company_name: string | null;
  created_at?: string | null;
};

type TokenRow = {
  balance: number | null;
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

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErrorMsg(null);

      // 1) pega usuário logado
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

      // 2) busca saldo
      const tokenPromise = supabase
        .from("user_token_balances")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle<TokenRow>();

      // 3) busca sites do usuário (histórico)
      const sitesPromise = supabase
        .from("sites")
        .select("id, slug, company_name, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      const [tokenRes, sitesRes] = await Promise.all([tokenPromise, sitesPromise]);

      if (!alive) return;

      // saldo
      if (tokenRes.error) {
        setBalance(0);
      } else {
        setBalance(tokenRes.data?.balance ?? 0);
      }

      // sites
      if (sitesRes.error) {
        setSites([]);
        setErrorMsg((prev) => prev ?? `Erro ao listar sites: ${sitesRes.error.message}`);
      } else {
        setSites((sitesRes.data as SiteRow[]) ?? []);
      }

      setLoading(false);
    }

    load();

    return () => {
      alive = false;
    };
  }, [supabase]);

  return (
    <div className="space-y-6 text-white">
      {/* erro */}
      {errorMsg ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMsg}
        </div>
      ) : null}

      {/* Cards superiores */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Tokens */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_10px_30px_rgba(0,0,0,.35)]">
          <div className="text-sm font-semibold text-white">Tokens disponíveis</div>

          <div className="mt-2 text-4xl font-bold tracking-tight text-white">
            {loading ? "—" : balance ?? 0}
          </div>

          <div className="mt-2 text-xs text-white/60">
            (Você ainda pode criar {loading ? "—" : balance ?? 0} Sites)
          </div>
        </div>

        {/* Criar novo */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_10px_30px_rgba(0,0,0,.35)]">
          <div className="text-sm font-semibold text-white">Criar Novo Site</div>
          <div className="mt-1 text-sm text-white/60">Gere seu site em segundos.</div>

          <div className="mt-4">
            <Link
              href="/sites/create"
              className="inline-flex items-center justify-center rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500"
            >
              + Criar Novo Site
            </Link>
          </div>
        </div>

        {/* Meus sites */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_10px_30px_rgba(0,0,0,.35)]">
          <div className="text-sm font-semibold text-white">Meus Sites</div>
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

      {/* Histórico */}
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
                sites.map((s) => (
                  <tr key={s.id} className="hover:bg-white/5">
                    <td className="py-3 font-semibold text-white">{s.slug}</td>

                    <td className="py-3 text-white/70">
                      {s.created_at ? new Date(s.created_at).toLocaleString("pt-BR") : "—"}
                    </td>

                    <td className="py-3 text-white/70">{`${s.slug}.plpainel.com`}</td>

                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/sites/${s.id}/edit`}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
                        >
                          Editar
                        </Link>

                        <Link
                          href={`/s/${s.slug}`}
                          target="_blank"
                          className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/15"
                        >
                          Abrir
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
