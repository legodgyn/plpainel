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

function getDiscountPercent(qty: number) {
  if (qty >= 100) return 20;
  if (qty >= 50) return 10;
  if (qty >= 25) return 5;
  return 0;
}

export default function TokensPage() {
  const router = useRouter();

  const sb = useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [tokens, setTokens] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const baseUnitPriceCents = 400;
  const discountPercent = getDiscountPercent(Number(tokens || 0));
  const originalTotalCents = Math.max(0, Number(tokens || 0)) * baseUnitPriceCents;
  const discountedTotalCents = Math.round(
    originalTotalCents * (1 - discountPercent / 100)
  );
  const savedCents = Math.max(0, originalTotalCents - discountedTotalCents);
  const effectiveUnitPriceCents =
    Number(tokens || 0) > 0
      ? Math.round(discountedTotalCents / Number(tokens || 0))
      : baseUnitPriceCents;

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
      const { data: userRes } = await sb.auth.getUser();
      if (!userRes.user) {
        router.push("/login");
        return;
      }

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

      router.push("/billing");
    } catch (e: any) {
      setErr(e?.message || "Erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 text-white">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Comprar Tokens</h1>
        <Link href="/dashboard" className="text-sm text-white/70 transition hover:text-white">
          ← Voltar para o Dashboard
        </Link>
      </div>

      {err ? (
        <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(0,0,0,.25)]">
        <div className="text-sm text-white/70">
          Pagamento disponível: <span className="font-semibold text-white">PIX</span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {packs.map((p) => {
            const packDiscount = getDiscountPercent(p.qty);
            const packOriginal = p.qty * baseUnitPriceCents;
            const packFinal = Math.round(packOriginal * (1 - packDiscount / 100));

            return (
              <button
                key={p.qty}
                disabled={loading}
                onClick={() => setTokens(p.qty)}
                className={`relative rounded-2xl border px-4 py-4 text-left transition ${
                  tokens === p.qty
                    ? "border-violet-400/40 bg-violet-500/15 shadow-[0_0_0_1px_rgba(167,139,250,.15)]"
                    : "border-white/10 bg-black/20 hover:bg-black/30"
                }`}
              >
                {packDiscount > 0 ? (
                  <div className="absolute right-3 top-3 rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-bold text-emerald-300 border border-emerald-500/20">
                    {packDiscount}% OFF
                  </div>
                ) : null}

                <div className="text-base font-semibold">{p.label}</div>

                {packDiscount > 0 ? (
                  <div className="mt-2 space-y-1">
                    <div className="text-xs text-white/40 line-through">
                      {money(packOriginal)}
                    </div>
                    <div className="text-sm font-semibold text-white">
                      {money(packFinal)}
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 text-sm text-white/60">{money(packOriginal)}</div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="text-sm font-semibold">Escolher quantidade</div>

            <div className="mt-3">
              <input
                type="number"
                min={5}
                step={1}
                value={tokens}
                onChange={(e) => setTokens(Number(e.target.value))}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-violet-400/40"
              />
            </div>

            <div className="mt-3 text-sm text-white/60">
              Compra mínima: 5 tokens
            </div>

            <div className="mt-6 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <div className="text-sm text-white/70">
                Cada token permite criar 1 site com publicação rápida no subdomínio da plataforma.
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="text-sm font-semibold">Resumo</div>

            <div className="mt-4 space-y-3 text-sm text-white/80">
              <div className="flex items-center justify-between">
                <span>Tokens</span>
                <span className="font-semibold text-white">{Number(tokens || 0)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span>Preço unitário</span>
                <span className="font-semibold text-white">{money(baseUnitPriceCents)}</span>
              </div>

              {discountPercent > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <span>Desconto</span>
                    <span className="font-semibold text-emerald-300">{discountPercent}% OFF</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Preço unitário com desconto</span>
                    <span className="font-semibold text-white">
                      {money(effectiveUnitPriceCents)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Valor original</span>
                    <span className="font-semibold text-white/50 line-through">
                      {money(originalTotalCents)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Você economiza</span>
                    <span className="font-semibold text-emerald-300">
                      {money(savedCents)}
                    </span>
                  </div>
                </>
              ) : null}

              <div className="flex items-center justify-between border-t border-white/10 pt-3">
                <span>Total</span>
                <span className="text-3xl font-bold text-white">
                  {money(discountedTotalCents)}
                </span>
              </div>
            </div>

            <button
              disabled={loading}
              onClick={() => handleBuyPix(tokens)}
              className="mt-6 w-full rounded-2xl bg-violet-600 px-5 py-4 font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Gerando PIX..." : "Comprar via PIX"}
            </button>

            <div className="mt-4 text-xs leading-6 text-white/55">
              Após gerar, vá em <span className="text-white/80">Minhas Compras</span> para copiar o código PIX.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
