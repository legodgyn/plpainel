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

    // se falhar e tiver TEST, tenta abaixo
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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const paymentId = String(body?.data?.id ?? body?.id ?? body?.resource ?? "").trim();
    if (!paymentId) return NextResponse.json({ ok: true, ignored: true });

    const supabase = createClient(
      env("NEXT_PUBLIC_SUPABASE_URL"),
      env("SUPABASE_SERVICE_ROLE_KEY")
    );

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

    // Idempotência
    if (order.status === "paid") {
      return NextResponse.json({ ok: true, already_paid: true });
    }

    // 🔢 Busca saldo atual (pode não existir linha)
    const { data: balanceRow } = await supabase
      .from("user_token_balances")
      .select("balance")
      .eq("user_id", order.user_id)
      .maybeSingle();

    const currentBalance = Number(balanceRow?.balance ?? 0);
    const newBalance = currentBalance + Number(order.tokens ?? 0);

    // 💰 UPSERT do saldo (cria se não existir)
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

// 1) procurar se esse usuário foi indicado
const { data: ref } = await supabase
  .from("referrals")
  .select("affiliate_user_id")
  .eq("referred_user_id", order.user_id)
  .maybeSingle();

if (ref?.affiliate_user_id) {
  // 2) buscar % do afiliado
  const { data: aff } = await supabase
    .from("affiliates")
    .select("commission_rate, is_active")
    .eq("user_id", ref.affiliate_user_id)
    .maybeSingle();

  if (aff?.is_active) {
    const rate = Number(aff.commission_rate ?? 0);
    const totalCents = Number(payment.transaction_amount || 0) * 100;

    // arredondamento seguro em centavos
    const amountCents = Math.max(0, Math.round(totalCents * rate));

    // 3) inserir (idempotente por unique(order_id))
    await supabase.from("affiliate_commissions").insert({
      affiliate_user_id: ref.affiliate_user_id,
      referred_user_id: order.user_id,
      order_id: order.id,
      amount_cents: amountCents,
      rate,
      status: "pending",
    }).catch(() => {
      // se já existe por unique, ignora
    });
  }
}

