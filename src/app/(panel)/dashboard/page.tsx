"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function DashboardPage() {
  const supabase = supabaseBrowser();
  const [email, setEmail] = useState<string>("");
  const [tokens, setTokens] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!session?.user) {
        window.location.href = "/login";
        return;
      }

      setEmail(session.user.email ?? "");

      const { data: wallet, error } = await supabase
        .from("token_wallets")
        .select("balance")
        .eq("user_id", session.user.id)
        .single();

      if (error) console.log(error);

      setTokens(wallet?.balance ?? 0);
      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen p-8 text-white/70">
        Carregando...
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-white/70 mt-1">Bem-vindo, {email}</p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="text-white/70">Tokens disponíveis</div>
            <div className="text-3xl font-semibold mt-2">{tokens}</div>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="text-white/70">Ações rápidas</div>
            <div className="mt-3 flex gap-3">
              <a className="rounded-xl bg-violet-600 hover:bg-violet-500 transition px-4 py-2 font-medium" href="/sites/new">
                Criar Site
              </a>
              <a className="rounded-xl bg-white/10 hover:bg-white/15 transition px-4 py-2 font-medium" href="/sites">
                Meus Sites
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
