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
  const prod = optEnv("MP_ACCESS_TOKEN").trim(); // APP_USR...
  const test = optEnv("MP_ACCESS_TOKEN_TEST").trim(); // TEST-... (opcional)

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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const paymentId = String(body?.data?.id ?? body?.id ?? body?.resource ?? "").trim();
    if (!paymentId) return NextResponse.json({ ok: true, ignored: true });

    const supabase = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

    // 🔎 Busca pagamento no Mercado Pago
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

    // Atualiza status MP sempre (mesmo pending)
    await supabase
      .from("token_orders")
      .update({
        mp_status: mpStatus || null,
        mp_payment_id: String(payment?.id ?? paymentId),
      })
      .eq("id", orderId);

    // Só processa crédito + comissão se aprovado
    if (mpStatus !== "approved") {
      return NextResponse.json({ ok: true, status: mpStatus });
    }

    // 🔒 Busca order
    const { data: order, error: orderErr } = await supabase
      .from("token_orders")
      .select("id,user_id,tokens,status")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ ok: true, ignored: "order_not_found", orderId });
    }

    // Idempotência: se já pago, não duplica nada
    if (order.status === "paid") {
      return NextResponse.json({ ok: true, already_paid: true });
    }

    // 🔢 Saldo atual
    const { data: balanceRow } = await supabase
      .from("user_token_balances")
      .select("balance")
      .eq("user_id", order.user_id)
      .maybeSingle();

    const currentBalance = Number(balanceRow?.balance ?? 0);
    const newBalance = currentBalance + Number(order.tokens ?? 0);

    // 💰 UPSERT do saldo
    await supabase
      .from("user_token_balances")
      .upsert(
        { user_id: order.user_id, balance: newBalance, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );

    // ✅ Marca order como paga
    await supabase
      .from("token_orders")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    // ==========================
    // ✅ AFILIADOS: cria comissão
    // ==========================
    // 1) acha referral do comprador
    const { data: refRow } = await supabase
      .from("referrals")
      .select("affiliate_user_id, referred_user_id, code")
      .eq("referred_user_id", order.user_id)
      .maybeSingle();

    if (refRow?.affiliate_user_id) {
      // 2) valida afiliado
      const { data: affRow } = await supabase
        .from("affiliates")
        .select("user_id, commission_rate, is_active")
        .eq("user_id", refRow.affiliate_user_id)
        .maybeSingle();

      const isActive = !!affRow?.is_active;
      const rate = Number(affRow?.commission_rate ?? 0);

      if (isActive && rate > 0) {
        // 3) base = valor pago no MP (R$ -> cents)
        const baseCents = Math.round(Number(payment?.transaction_amount ?? 0) * 100);
        const commissionCents = Math.max(0, Math.round(baseCents * rate));

        if (commissionCents > 0) {
          // 4) idempotência: não duplica comissão por order_id
          const { data: existing } = await supabase
            .from("affiliate_commissions")
            .select("id")
            .eq("order_id", orderId)
            .maybeSingle();

          if (!existing?.id) {
            await supabase.from("affiliate_commissions").insert({
              affiliate_user_id: refRow.affiliate_user_id,
              referred_user_id: order.user_id,
              order_id: orderId,
              amount_cents: commissionCents,
              status: "approved", // como o pagamento já foi approved
              created_at: new Date().toISOString(),
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
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erro" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
