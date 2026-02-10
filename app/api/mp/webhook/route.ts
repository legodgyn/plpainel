import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function fetchPayment(paymentId: string) {
  const token = env("MP_ACCESS_TOKEN");

  const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!r.ok) return null;
  return r.json();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const paymentId = String(body?.data?.id ?? "").trim();
    if (!paymentId) return NextResponse.json({ ok: true });

    const payment = await fetchPayment(paymentId);
    if (!payment) return NextResponse.json({ ok: true });

    const mpStatus = payment.status;
    const orderId = String(payment.external_reference || "").trim();

    if (!orderId) return NextResponse.json({ ok: true });

    const supabase = createClient(
      env("NEXT_PUBLIC_SUPABASE_URL"),
      env("SUPABASE_SERVICE_ROLE_KEY")
    );

    // atualiza status MP
    await supabase
      .from("token_orders")
      .update({
        mp_status: mpStatus,
        mp_payment_id: payment.id,
      })
      .eq("id", orderId);

    if (mpStatus !== "approved") {
      return NextResponse.json({ ok: true, status: mpStatus });
    }

    // busca order
    const { data: order } = await supabase
      .from("token_orders")
      .select("id,user_id,status")
      .eq("id", orderId)
      .single();

    if (!order || order.status === "paid") {
      return NextResponse.json({ ok: true, ignored: "already_paid" });
    }

    // marca order como paga
    await supabase
      .from("token_orders")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    // =========================
    // AFILIADO
    // =========================
    const { data: referral } = await supabase
      .from("referrals")
      .select("affiliate_user_id")
      .eq("referred_user_id", order.user_id)
      .maybeSingle();

    if (!referral?.affiliate_user_id) {
      return NextResponse.json({ ok: true, affiliate: false });
    }

    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("commission_rate,is_active")
      .eq("user_id", referral.affiliate_user_id)
      .single();

    if (!affiliate?.is_active) {
      return NextResponse.json({ ok: true, affiliate: "inactive" });
    }

    const grossCents = Math.round(Number(payment.transaction_amount) * 100);
    const commissionCents = Math.round(grossCents * Number(affiliate.commission_rate));

    await supabase.from("affiliate_commissions").insert({
      affiliate_user_id: referral.affiliate_user_id,
      referred_user_id: order.user_id,
      order_id: order.id,
      amount_cents: commissionCents,
      status: "approved",
    });

    return NextResponse.json({ ok: true, commission: commissionCents });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
