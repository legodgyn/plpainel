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

  // tenta PROD
  if (prod) {
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${prod}` },
      cache: "no-store",
    });
    if (r.ok) return { payment: await r.json(), used: "prod" as const };
  }

  // tenta TEST (se existir)
  if (test) {
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${test}` },
      cache: "no-store",
    });
    if (r.ok) return { payment: await r.json(), used: "test" as const };
  }

  return null;
}

function isDuplicateErr(err: any) {
  const msg = String(err?.message || "").toLowerCase();
  // cobre supabase/postgres comuns
  return msg.includes("duplicate") || msg.includes("unique") || msg.includes("23505");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const paymentId = String(body?.data?.id ?? body?.id ?? body?.resource ?? "").trim();
    if (!paymentId) return NextResponse.json({ ok: true, ignored: true });

    const supabase = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

    // 🔎 Busca pagamento no Mercado Pago (PROD e fallback TEST)
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

    // Só credita se aprovado
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

    // Idempotência: se já pagou, não credita de novo (mas ainda pode garantir comissão)
    const alreadyPaid = order.status === "paid";

    // 🔢 Busca saldo atual (pode não existir linha)
    if (!alreadyPaid) {
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
    }

    // ==========================
    // ✅ AFILIADOS (COMISSÃO)
    // ==========================
    // 1) vê se esse user veio por referral
    const { data: referral, error: refErr } = await supabase
      .from("referrals")
      .select("affiliate_user_id")
      .eq("referred_user_id", order.user_id)
      .maybeSingle();

    if (!refErr && referral?.affiliate_user_id) {
      // 2) pega config do afiliado
      const { data: affiliate, error: affErr } = await supabase
        .from("affiliates")
        .select("user_id,commission_rate,is_active")
        .eq("user_id", referral.affiliate_user_id)
        .maybeSingle();

      if (!affErr && affiliate?.is_active) {
        const rate = Number(affiliate.commission_rate ?? 0); // ex: 0.30

        // valor em cents do pagamento (MP)
        const totalCents = Math.round(Number(payment?.transaction_amount ?? 0) * 100);
        const commissionCents = Math.max(0, Math.round(totalCents * rate));

        // 3) cria a comissão (idempotente: se já existe pra esse order, ignora)
        // ⚠️ Recomendo ter UNIQUE(order_id) OU UNIQUE(order_id, affiliate_user_id) em affiliate_commissions.
        const { error: commErr } = await supabase.from("affiliate_commissions").insert({
          affiliate_user_id: referral.affiliate_user_id,
          referred_user_id: order.user_id,
          order_id: order.id,
          amount_cents: commissionCents,
          status: "approved",
        });

        if (commErr && !isDuplicateErr(commErr)) {
          console.error("affiliate_commissions insert error:", commErr);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      status: "approved",
      credited: alreadyPaid ? 0 : order.tokens,
      already_paid: alreadyPaid,
      token_used: fetched.used,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erro" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
