import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const paymentId =
      body?.data?.id ?? body?.id ?? body?.resource ?? null;

    if (!paymentId) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const supabase = createClient(
      env("NEXT_PUBLIC_SUPABASE_URL"),
      env("SUPABASE_SERVICE_ROLE_KEY")
    );

    // 🔎 Busca pagamento no Mercado Pago
    const mpRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${env("MP_ACCESS_TOKEN")}`,
        },
        cache: "no-store",
      }
    );

    if (!mpRes.ok) {
      return NextResponse.json({ ok: true, mp_fetch_failed: true });
    }

    const payment = await mpRes.json();
    const status = payment.status;
    const orderId = payment.external_reference;

    if (!orderId) {
      return NextResponse.json({ ok: true, ignored: "no_external_reference" });
    }

    // Atualiza status MP sempre
    await supabase
      .from("token_orders")
      .update({
        mp_status: status,
        mp_payment_id: String(payment.id),
      })
      .eq("id", orderId);

    // ⛔ Ainda não pago
    if (status !== "approved") {
      return NextResponse.json({ ok: true, status });
    }

    // 🔒 Busca order
    const { data: order } = await supabase
      .from("token_orders")
      .select("id,user_id,tokens,status")
      .eq("id", orderId)
      .single();

    // Idempotência
    if (order.status === "paid") {
      return NextResponse.json({ ok: true, already_paid: true });
    }

    // 🔢 Busca saldo atual
    const { data: balanceRow } = await supabase
      .from("user_token_balances")
      .select("balance")
      .eq("user_id", order.user_id)
      .single();

    const currentBalance = balanceRow?.balance ?? 0;
    const newBalance = currentBalance + order.tokens;

    // 💰 Atualiza saldo
    await supabase
      .from("user_token_balances")
      .update({ balance: newBalance })
      .eq("user_id", order.user_id);

    // ✅ Marca order como paga
    await supabase
      .from("token_orders")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    return NextResponse.json({
      ok: true,
      status: "approved",
      credited: order.tokens,
      new_balance: newBalance,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}