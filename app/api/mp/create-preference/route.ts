import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type Body = {
  quantity: number;
};

function moneyBRL(n: number) {
  return Number(n.toFixed(2));
}

export async function POST(req: Request) {
  try {
    const { quantity }: Body = await req.json();

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty < 5) {
      return NextResponse.json(
        { error: "Quantidade inválida. Mínimo 5 tokens." },
        { status: 400 }
      );
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user || userErr) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const unitPrice = Number(process.env.NEXT_PUBLIC_TOKEN_UNIT_PRICE ?? "4");
    const amount = moneyBRL(qty * unitPrice);

    // 1) cria order (status pending)
    const { data: order, error: orderErr } = await supabase
      .from("token_orders")
      .insert({
        user_id: user.id,
        quantity: qty,
        unit_price: moneyBRL(unitPrice),
        amount,
        status: "pending",
        provider: "mercadopago",
      })
      .select("id")
      .single();

    if (orderErr || !order) {
      return NextResponse.json(
        { error: `Erro criando pedido: ${orderErr?.message ?? "sem detalhes"}` },
        { status: 500 }
      );
    }

    // 2) Mercado Pago (PIX only)
    const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN!;
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL!; // ex: https://app.plpainel.com (ou http://localhost:3000)

    const preferencePayload = {
      items: [
        {
          title: `${qty} token(s) - plpainel`,
          quantity: 1,
          currency_id: "BRL",
          unit_price: amount,
        },
      ],
      payer: {
        email: user.email ?? undefined,
      },
      payment_methods: {
        default_payment_method_id: "pix",
        excluded_payment_types: [{ id: "credit_card" }, { id: "debit_card" }, { id: "ticket" }, { id: "atm" }],
        excluded_payment_methods: [],
        installments: 1,
      },
      back_urls: {
        success: `${APP_URL}/checkout/pending?order=${order.id}`,
        pending: `${APP_URL}/checkout/pending?order=${order.id}`,
        failure: `${APP_URL}/checkout/failure?order=${order.id}`,
      },
      auto_return: "approved",
      notification_url: `${APP_URL}/api/mp/webhook`,
      external_reference: order.id, // IMPORTANTÍSSIMO pra casar no webhook
      metadata: { order_id: order.id, user_id: user.id, quantity: qty },
    };

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferencePayload),
    });

    const mpJson = await mpRes.json();
    if (!mpRes.ok) {
      return NextResponse.json(
        { error: "Erro Mercado Pago", details: mpJson },
        { status: 500 }
      );
    }

    // 3) salva preference_id e init_point
    await supabase
      .from("token_orders")
      .update({
        mp_preference_id: mpJson.id,
        mp_init_point: mpJson.init_point,
      })
      .eq("id", order.id);

    return NextResponse.json({
      order_id: order.id,
      init_point: mpJson.init_point,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erro inesperado" }, { status: 500 });
  }
}
