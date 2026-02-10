"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

export default function TokenBadge() {
  const [balance, setBalance] = useState<number | null>(null);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setBalance(null);

    const { data, error } = await supabase
      .from("user_tokens")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (error) {
      // se não existir linha ainda, mostra 0
      setBalance(0);
      return;
    }

    setBalance(data?.balance ?? 0);
  }

  useEffect(() => {
    load();

    // atualiza se o usuário fizer login/logout em outra aba
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="rounded-full bg-black/25 px-3 py-1 text-xs text-white/90 border border-white/10">
      Tokens: <b>{balance ?? "—"}</b>
    </div>
  );
}
