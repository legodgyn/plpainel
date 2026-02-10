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

function isDuplicateError(err: any) {
  const msg = String(err?.message || "").toLowerCase();
  // cobre supabase/postgres e mensagens comuns
  return msg.includes("duplicate") || msg.includes("already exists") || msg.includes("unique");
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

    // 🔒 Busca order (agora também usamos tokens)
    const { data: order, error: orderErr } = await supabase
      .from("token_orders")
      .select("id,user_id,tokens,status")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ ok: true, ignored: "order_not_found", orderId });
    }

    // Idempotência
    const alreadyPaid = String(order.status || "").toLowerCase() === "paid";

    // 🔢 Busca saldo atual (pode não existir linha)
    if (!alreadyPaid) {
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
    }

    // =========================================================
    // ✅ AFILIADOS: cria comissão quando houver referral
    // =========================================================
    // 1) acha quem é o afiliado do comprador
    const { data: refRow } = await supabase
      .from("referrals")
      .select("affiliate_user_id,referred_user_id,code")
      .eq("referred_user_id", order.user_id)
      .maybeSingle();

    if (refRow?.affiliate_user_id) {
      // 2) busca taxa do afiliado
      const { data: affRow } = await supabase
        .from("affiliates")
        .select("user_id,commission_rate,is_active")
        .eq("user_id", refRow.affiliate_user_id)
        .maybeSingle();

      const isActive = !!affRow?.is_active;
      const rate = Number(affRow?.commission_rate ?? 0);

      // 3) valor base: usa o valor real do pagamento no MP
      const txAmount = Number(payment?.transaction_amount ?? 0); // em BRL
      const grossCents = Math.round(txAmount * 100);

      if (isActive && rate > 0 && grossCents > 0) {
        const commissionCents = Math.max(0, Math.round(grossCents * rate));

        // 4) insere comissão (idempotente por order_id)
        const { error: commErr } = await supabase.from("affiliate_commissions").insert({
          affiliate_user_id: refRow.affiliate_user_id,
          referred_user_id: order.user_id,
          order_id: order.id,
          amount_cents: commissionCents,
          status: "approved", // ou "pending" se você quiser aprovar manualmente
        });

        if (commErr && !isDuplicateError(commErr)) {
          console.error("affiliate_commissions insert error:", commErr);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      status: "approved",
      credited: order.tokens,
      token_used: fetched.used,
      affiliate_checked: true,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erro" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
