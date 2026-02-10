import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function optEnv(name: string) {
  return process.env[name] || "";
}

async function fetchPayment(paymentId: string) {
  const prod = optEnv("MP_ACCESS_TOKEN").trim();
  const test = optEnv("MP_ACCESS_TOKEN_TEST").trim();

  if (prod) {
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${prod}` },
      cache: "no-store",
    });
    if (r.ok) return { payment: await r.json(), used: "prod" as const };
  }

  if (test) {
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${test}` },
      cache: "no-store",
    });
    if (r.ok) return { payment: await r.json(), used: "test" as const };
  }

  return null;
}

function toCents(v: any) {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const paymentId = String(body?.data?.id ?? body?.id ?? body?.resource ?? "").trim();
    if (!paymentId) return NextResponse.json({ ok: true, ignored: true });

    const supabase = createClient(
      env("NEXT_PUBLIC_SUPABASE_URL"),
      env("SUPABASE_SERVICE_ROLE_KEY")
    );

    const fetched = await fetchPayment(paymentId);
    if (!fetched) {
      return NextResponse.json({ ok: true, mp_fetch_failed: true, paymentId });
    }

    const payment = fetched.payment;
    const mpStatus = String(payment?.status ?? "");
    const orderId = String(payment?.external_reference ?? "").trim();

    if (!orderId) {
      return NextResponse.json({ ok: true, ignored: "no_external_reference" });
    }

    // Atualiza status MP sempre
    await supabase
      .from("token_orders")
      .update({
        mp_status: mpStatus || null,
        mp_payment_id: String(payment?.id ?? paymentId),
      })
      .eq("id", orderId);

    if (mpStatus !== "approved") {
      return NextResponse.json({ ok: true, status: mpStatus });
    }

    // Busca order
    const { data: order, error: orderErr } = await supabase
      .from("token_orders")
      .select("id,user_id,tokens,status")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ ok: true, ignored: "order_not_found", orderId });
    }

    // Idempotência do pedido
    if (order.status === "paid") {
      return NextResponse.json({ ok: true, already_paid: true });
    }

    // Saldo atual
    const { data: balanceRow } = await supabase
      .from("user_token_balances")
      .select("balance")
      .eq("user_id", order.user_id)
      .maybeSingle<{ balance: number | null }>();

    const currentBalance = Number(balanceRow?.balance ?? 0);
    const newBalance = currentBalance + Number(order.tokens ?? 0);

    // UPSERT saldo
    await supabase
      .from("user_token_balances")
      .upsert(
        { user_id: order.user_id, balance: newBalance, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );

    // Marca order como paga
    await supabase
      .from("token_orders")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    // ============================
    // ✅ AFILIADOS: cria comissão
    // ============================

    // 1) pega referral do comprador
    const { data: referralRow } = await supabase
      .from("referrals")
      .select("affiliate_user_id, code")
      .eq("referred_user_id", order.user_id)
      .maybeSingle<{ affiliate_user_id: string | null; code: string | null }>();

    let affiliateUserId: string | null = referralRow?.affiliate_user_id ?? null;
    const refCode = (referralRow?.code ?? "").trim();

    // ✅ Fallback: se affiliate_user_id veio NULL, resolve pelo code
    if (!affiliateUserId && refCode) {
      const { data: affByCode } = await supabase
        .from("affiliates")
        .select("user_id")
        .eq("code", refCode)
        .maybeSingle<{ user_id: string }>();

      affiliateUserId = affByCode?.user_id ?? null;

      // (opcional, mas recomendado) atualiza a referral pra já deixar amarrado
      if (affiliateUserId) {
        await supabase
          .from("referrals")
          .update({ affiliate_user_id: affiliateUserId })
          .eq("referred_user_id", order.user_id)
          .eq("code", refCode);
      }
    }

    if (affiliateUserId) {
      const { data: aff } = await supabase
        .from("affiliates")
        .select("commission_rate,is_active")
        .eq("user_id", affiliateUserId)
        .maybeSingle<{ commission_rate: number | null; is_active: boolean | null }>();

      const isActive = aff?.is_active !== false;
      const rate = Number(aff?.commission_rate ?? 0.3);

      if (isActive && rate > 0) {
        const paidCents =
          toCents(payment?.transaction_amount) ||
          toCents(payment?.transaction_details?.total_paid_amount) ||
          0;

        const commissionCents = Math.max(0, Math.round(paidCents * rate));

        if (commissionCents > 0) {
          // idempotência
          const { data: existing } = await supabase
            .from("affiliate_commissions")
            .select("id")
            .eq("order_id", orderId)
            .eq("affiliate_user_id", affiliateUserId)
            .maybeSingle<{ id: string }>();

          if (!existing?.id) {
            await supabase.from("affiliate_commissions").insert({
              affiliate_user_id: affiliateUserId,
              referred_user_id: order.user_id,
              order_id: orderId,
              amount_cents: commissionCents,
              status: "pending",
            });
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      status: "approved",
      credited: order.tokens,
      new_balance: newBalance,
      token_used: fetched.used,
      affiliate_user_id: affiliateUserId,
      referral_code: refCode || null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
