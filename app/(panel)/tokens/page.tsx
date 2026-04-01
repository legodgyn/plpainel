"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { trackBeginCheckout } from "@/lib/ga";

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

  const [tokens, setTokens] = useState<number>(25);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const baseUnitPriceCents = 500;

  const discountPercent = getDiscountPercent(Number(tokens || 0));
  const originalTotalCents = Math.max(0, Number(tokens || 0)) * baseUnitPriceCents;
  const discountedTotalCents = Math.round(originalTotalCents * (1 - discountPercent / 100));
  const savedCents = Math.max(0, originalTotalCents - discountedTotalCents);

  const effectiveUnitPriceCents =
    Number(tokens || 0) > 0
      ? Math.round(discountedTotalCents / Number(tokens || 0))
      : baseUnitPriceCents;

  const packs = [
    { label: "10 tokens", qty: 10 },
    { label: "25 tokens", qty: 25, popular: true, subtitle: "Melhor custo-benefício" },
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

      trackBeginCheckout({
        value: discountedTotalCents / 100,
        currency: "BRL",
        items: [
          {
            item_id: json.order_id,
            item_name: `${q} Tokens`,
            price: discountedTotalCents / 100,
            quantity: 1,
          },
        ],
      });

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
        <div>
          <h1 className="text-3xl font-bold">Comprar Tokens</h1>
          <p className="mt-1 text-sm text-white/60">
            Escolha a quantidade ideal para criar seus sites com rapidez.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="text-sm text-white/70 transition hover:text-white"
        >
          ← Voltar para o Dashboard
        </Link>
      </div>

      {err ? (
        <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(0,0,0,.25)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-white/70">
            Pagamento disponível: <span className="font-semibold text-white">PIX</span>
          </div>

          <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
            Mais sites = Mais BM's Verificadas!
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {packs.map((p) => {
            const packDiscount = getDiscountPercent(p.qty);
            const packOriginal = p.qty * baseUnitPriceCents;
            const packFinal = Math.round(packOriginal * (1 - packDiscount / 100));
            const isPopular = (p as any).popular;
            const isSelected = tokens === p.qty;

            return (
              <button
                key={p.qty}
                disabled={loading}
                onClick={() => setTokens(p.qty)}
                className={`relative rounded-2xl border px-5 py-5 text-left transition duration-200 ${
                  isPopular
                    ? `scale-[1.03] ${
                        isSelected
                          ? "border-violet-300 bg-violet-500/20 shadow-[0_20px_50px_rgba(139,92,246,.22)]"
                          : "border-violet-400/70 bg-violet-500/14 shadow-[0_14px_35px_rgba(139,92,246,.15)] hover:bg-violet-500/18"
                      }`
                    : isSelected
                    ? "border-violet-400/40 bg-violet-500/15 shadow-[0_0_0_1px_rgba(167,139,250,.15)]"
                    : "border-white/10 bg-black/20 hover:bg-black/30"
                }`}
              >
                {isPopular ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                      MAIS VENDIDO
                    </span>
                  </div>
                ) : null}

                {packDiscount > 0 ? (
                  <div className="absolute right-3 top-3 rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2 py-1 text-[10px] font-bold text-emerald-300">
                    {packDiscount}% OFF
                  </div>
                ) : null}

                <div className="text-base font-semibold">{p.label}</div>

                {"subtitle" in p && p.subtitle ? (
                  <div className="mt-1 text-xs text-emerald-300">{p.subtitle}</div>
                ) : null}

                {packDiscount > 0 ? (
                  <div className="mt-3 space-y-1">
                    <div className="text-xs text-white/40 line-through">
                      {money(packOriginal)}
                    </div>
                    <div className="text-lg font-bold text-white">
                      {money(packFinal)}
                    </div>
                    <div className="text-xs text-emerald-300">
                      Economiza {money(packOriginal - packFinal)}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-white/60">{money(packOriginal)}</div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="text-sm font-semibold text-white/80">Escolha personalizada</div>
            <div className="mt-1 text-sm text-white/55">
              Selecione a quantidade ideal de tokens para o seu volume de sites.
            </div>

            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="w-full sm:max-w-[220px]">
                <label className="text-xs text-white/60">Quantidade de tokens</label>
                <input
                  type="number"
                  min={5}
                  step={1}
                  value={tokens}
                  onChange={(e) => {
                    const v = Number(e.target.value || 0);
                    setTokens(v);
                  }}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-400"
                />
              </div>

              <button
                disabled={loading}
                onClick={() => handleBuyPix(tokens)}
                className="inline-flex h-[50px] items-center justify-center rounded-2xl bg-emerald-600 px-6 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Gerando PIX..." : "Comprar com PIX"}
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-white/50">Preço unitário base</div>
                  <div className="mt-1 text-sm font-semibold text-white">
                    {money(baseUnitPriceCents)}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-white/50">Preço unitário final</div>
                  <div className="mt-1 text-sm font-semibold text-white">
                    {money(effectiveUnitPriceCents)}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-white/50">Desconto aplicado</div>
                  <div className="mt-1 text-sm font-semibold text-emerald-300">
                    {discountPercent > 0 ? `${discountPercent}% OFF` : "Sem desconto"}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-white/50">Você economiza</div>
                  <div className="mt-1 text-sm font-semibold text-emerald-300">
                    {savedCents > 0 ? money(savedCents) : "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="text-sm font-semibold text-white/80">Resumo do pedido</div>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between text-sm text-white/70">
                <span>Quantidade</span>
                <span className="font-semibold text-white">{tokens} tokens</span>
              </div>

              <div className="flex items-center justify-between text-sm text-white/70">
                <span>Subtotal</span>
                <span className={discountPercent > 0 ? "line-through text-white/40" : "text-white"}>
                  {money(originalTotalCents)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm text-white/70">
                <span>Desconto</span>
                <span className="font-semibold text-emerald-300">
                  {discountPercent > 0 ? `-${money(savedCents)}` : "—"}
                </span>
              </div>

              <div className="border-t border-white/10 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">Total</span>
                  <span className="text-2xl font-bold text-white">
                    {money(discountedTotalCents)}
                  </span>
                </div>
              </div>
            </div>

            <button
              disabled={loading}
              onClick={() => handleBuyPix(tokens)}
              className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-violet-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Gerando PIX..." : "Gerar PIX agora"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
