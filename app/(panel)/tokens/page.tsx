"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type CreatePixResponse = {
  order_id: string;
  mp_payment_id: string;
  status: string;
  ticket_url?: string | null;
  qr_base64?: string | null;
  qr_code?: string | null;
  pix_copy_paste?: string | null;
  error?: string;
  details?: any;
};

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function TokensPage() {
  const router = useRouter();

  // ✅ NUNCA use "supabase" fora daqui
  const sb = useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [tokens, setTokens] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const unitPriceCents = 400;
  const totalCents = Math.max(0, Number(tokens || 0)) * unitPriceCents;

  const packs = [
    { label: "10 tokens", qty: 10 },
    { label: "25 tokens", qty: 25 },
    { label: "50 tokens", qty: 50 },
    { label: "100 tokens", qty: 100 },
  ];

  async function handleBuyPix(qty: number) {
    setErr(null);

    const q = Number(qty);
    if (!Number.isFinite(q) || q < 5) {
      setErr("Compra mínima: 5 tokens.");
      return;
    }

    setLoading(true);
    try {
      // ✅ usuário logado?
      const { data: userRes } = await sb.auth.getUser();
      if (!userRes.user) {
        router.push("/login");
        return;
      }

      // ✅ pega access_token
      const { data: sess } = await sb.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) {
        setErr("Sessão não carregou. Recarregue a página e tente novamente.");
        return;
      }

      const res = await fetch("/api/mp/create-pix", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tokens: q }),
      });

      const json = (await res.json()) as CreatePixResponse;

      if (!res.ok) {
  const detailsText =
    json?.details?.message ||
    json?.details?.error ||
    JSON.stringify(json?.details || {});

  setErr(`${json.error || "Erro ao gerar PIX"}: ${detailsText}`);
  console.log("MP error full:", json);
  return;
}


      // ✅ manda pro billing (Minhas Compras)
      router.push("/billing");
    } catch (e: any) {
      setErr(e?.message || "Erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-white">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Comprar Tokens</h1>
        <Link href="/dashboard" className="text-sm text-white/70 hover:text-white">
          ← Voltar para o Dashboard
        </Link>
      </div>

      {err ? (
        <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-sm text-white/70">
          Pagamento disponível: <span className="font-semibold text-white">PIX</span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {packs.map((p) => (
            <button
              key={p.qty}
              disabled={loading}
              onClick={() => setTokens(p.qty)}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                tokens === p.qty
                  ? "border-violet-400/40 bg-violet-500/15"
                  : "border-white/10 bg-black/20 hover:bg-black/30"
              }`}
            >
              <div className="text-sm font-semibold">{p.label}</div>
              <div className="mt-1 text-xs text-white/60">{money(p.qty * unitPriceCents)}</div>
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="text-sm font-semibold">Escolher quantidade</div>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="number"
                min={5}
                step={1}
                value={tokens}
                onChange={(e) => setTokens(Number(e.target.value))}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400/40"
              />
            </div>
            <div className="mt-2 text-xs text-white/55">Compra mínima: 5 tokens</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="text-sm font-semibold">Resumo</div>

            <div className="mt-3 space-y-2 text-sm text-white/80">
              <div className="flex items-center justify-between">
                <span>Tokens</span>
                <span className="font-semibold text-white">{Number(tokens || 0)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span>Preço unitário</span>
                <span className="font-semibold text-white">{money(unitPriceCents)}</span>
              </div>

              <div className="flex items-center justify-between border-t border-white/10 pt-2">
                <span>Total</span>
                <span className="text-lg font-bold text-white">{money(totalCents)}</span>
              </div>
            </div>

            <button
              disabled={loading}
              onClick={() => handleBuyPix(tokens)}
              className="mt-4 w-full rounded-2xl bg-violet-600 px-5 py-4 font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Gerando PIX..." : "Comprar via PIX"}
            </button>

            <div className="mt-3 text-xs text-white/55">
              Após gerar, vá em <span className="text-white/80">Minhas Compras</span> para copiar o código PIX.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
