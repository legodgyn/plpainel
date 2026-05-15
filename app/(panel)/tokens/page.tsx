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
    { label: "10 tokens", qty: 10, note: "Para testar campanhas" },
    { label: "25 tokens", qty: 25, popular: true, note: "Melhor custo-beneficio" },
    { label: "50 tokens", qty: 50, note: "Operacao recorrente" },
    { label: "100 tokens", qty: 100, note: "Maior economia" },
  ];

  async function handleBuyPix(qty: number) {
    setErr(null);

    const q = Number(qty);
    if (!Number.isFinite(q) || q < 5) {
      setErr("Compra minima: 5 tokens.");
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
        setErr("Sessao nao carregou. Recarregue a pagina e tente novamente.");
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
    <main className="pl-page max-w-7xl space-y-6">
      <div className="pl-page-title">
        <div>
          <span className="pl-badge pl-badge-ok">PIX instantaneo</span>
          <h1>Comprar Tokens</h1>
          <p>Escolha um pacote ou informe uma quantidade personalizada para criar novos sites.</p>
        </div>

        <Link href="/billing" className="pl-btn">
          Minhas compras
        </Link>
      </div>

      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {err}
        </div>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <div className="pl-card space-y-5">
          <div className="pl-card-head">
            <div>
              <h2>Pacotes de tokens</h2>
              <p>Os mesmos pacotes atuais, agora mais faceis de comparar.</p>
            </div>
            <span className="pl-badge">R$ 5,00 por token</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {packs.map((pack) => {
              const packDiscount = getDiscountPercent(pack.qty);
              const packOriginal = pack.qty * baseUnitPriceCents;
              const packFinal = Math.round(packOriginal * (1 - packDiscount / 100));
              const selected = tokens === pack.qty;

              return (
                <button
                  key={pack.qty}
                  type="button"
                  disabled={loading}
                  onClick={() => setTokens(pack.qty)}
                  className={`relative rounded-[28px] border p-5 text-left transition hover:-translate-y-0.5 ${
                    selected
                      ? "border-amber-400 bg-amber-50 shadow-[0_22px_55px_rgba(245,158,11,.24)] ring-2 ring-amber-200/70"
                      : "border-slate-200 bg-white shadow-sm hover:border-amber-300 hover:bg-amber-50/50"
                  }`}
                >
                  <div className="flex min-h-14 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-lg font-black text-slate-950">{pack.label}</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">{pack.note}</div>
                    </div>

                    {pack.popular ? (
                      <span className="shrink-0 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-950 shadow-[0_8px_20px_rgba(245,158,11,.25)]">
                        Mais vendido
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-5 space-y-1">
                    {packDiscount > 0 ? (
                      <div className="text-xs font-bold text-slate-400 line-through">
                        {money(packOriginal)}
                      </div>
                    ) : null}
                    <div className="text-2xl font-black text-slate-950">{money(packFinal)}</div>
                    <div className={selected ? "text-xs font-black text-amber-700" : "text-xs font-bold text-emerald-700"}>
                      {packDiscount > 0
                        ? `${packDiscount}% OFF, economiza ${money(packOriginal - packFinal)}`
                        : "Sem desconto aplicado"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pl-card-soft">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <label className="pl-label">Quantidade personalizada</label>
                <input
                  className="pl-input mt-2 max-w-xs"
                  type="number"
                  min={5}
                  step={1}
                  value={tokens}
                  onChange={(e) => setTokens(Number(e.target.value || 0))}
                />
                <p className="mt-2 text-xs font-semibold text-slate-500">
                  A compra minima e de 5 tokens. Descontos entram automaticamente a partir de 25 tokens.
                </p>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleBuyPix(tokens)}
                className="pl-btn pl-btn-primary justify-center px-8"
              >
                {loading ? "Gerando PIX..." : "Comprar com PIX"}
              </button>
            </div>
          </div>
        </div>

        <aside className="pl-card flex h-full flex-col">
          <div className="pl-card-head">
            <div>
              <h2>Resumo da compra</h2>
              <p>Confira o total antes de gerar o PIX.</p>
            </div>
          </div>

          <div className="mt-2 flex-1 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm">
              <span className="font-semibold text-slate-500">Quantidade</span>
              <span className="font-black text-slate-950">{tokens} tokens</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm">
              <span className="font-semibold text-slate-500">Subtotal</span>
              <span className={discountPercent > 0 ? "font-bold text-slate-400 line-through" : "font-bold text-slate-950"}>
                {money(originalTotalCents)}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm">
              <span className="font-semibold text-slate-500">Desconto</span>
              <span className="font-black text-emerald-700">
                {discountPercent > 0 ? `-${money(savedCents)}` : "Sem desconto"}
              </span>
            </div>
            <div className="rounded-[24px] bg-slate-950 p-5 text-white">
              <div className="text-xs font-bold uppercase tracking-wide text-white/55">Total</div>
              <div className="mt-1 text-3xl font-black">{money(discountedTotalCents)}</div>
              <div className="mt-2 text-xs font-semibold text-emerald-200">
                Preco final medio: {money(effectiveUnitPriceCents)} por token.
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleBuyPix(tokens)}
            className="pl-btn pl-btn-primary mt-5 w-full justify-center"
          >
            {loading ? "Gerando PIX..." : "Gerar PIX agora"}
          </button>
        </aside>
      </section>
    </main>
  );
}
