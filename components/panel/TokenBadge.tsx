"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

export default function TokenBadge() {
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    let sub: any;

    async function run() {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) return;

      // Busca saldo inicial
      const { data } = await supabase
        .from("user_token_balances")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();

      setBalance(Number(data?.balance ?? 0));

      // Realtime: atualiza quando mudar
      sub = supabase
        .channel("token-balance")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_token_balances",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const b = (payload.new as any)?.balance;
            if (b !== undefined && b !== null) setBalance(Number(b));
          }
        )
        .subscribe();
    }

    run();

    return () => {
      if (sub) supabase.removeChannel(sub);
    };
  }, []);

  return <span>Tokens: {balance}</span>;
}
