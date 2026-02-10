import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function optEnv(name: string) {
  return (process.env[name] || "").trim();
}

/**
 * Mercado Pago manda vários formatos:
 * - { data: { id } }
 * - { id }
 * - { resource: "https://api.mercadopago.com/v1/payments/123" }
 */
function extractPaymentId(body: any) {
  const a = String(body?.data?.id ?? "").trim();
  if (a) return a;

  const b = String(body?.id ?? "").trim();
  if (b) return b;

  const r = String(body?.resource ?? "").trim();
  if (r) {
    const m = r.match(/\/payments\/(\d+)/);
    if (m?.[1]) return m[1];
    // às vezes vem só "123"
    if (/^\d+$/.test(r)) return r;
  }

  return "";
}

async function fetchPayment(paymentId: string) {
  const prod = optEnv("MP_ACCESS_TOKEN"); // APP_USR...
  const test = optEnv("MP_ACCESS_TOKEN_TEST"); // TEST-... opcional

  const tryToken = async (token: string) => {
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!r.ok) return null;
    return await r.json();
  };

  if (prod) {
    const p = await tryToken(prod);
    if (p) return { payment: p, used: "prod" as const };
  }

  if (test) {
    const p = await tryToken(test);
    if (p) return { payment: p, used: "test" as const };
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const paymentId = extractPaymentId(body);

    // sempre responde 200 pro MP não ficar re-tentando infinito
    if (!paymentId) return NextResponse.json({ ok: true, ignored: "no_payment_id" });

    const supabase = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

    const fetched = await fetchPayment(paymentId);
    if (!fetched) {
      // não conseguiu buscar no MP -> ignora (mas 200)
      return NextResponse.json({ ok: true, mp_fetch_failed: true, paymentId });
    }

    const payment = fetched.payment;

    const mpStatus = String(payment?.status ?? "").trim().toLowerCase(); // approved | pending | rejected...
    const mpPaymentId = String(payment?.id ?? paymentId).trim();

    // ⚠️ Aqui é o ponto-chave: external_reference deve ser o ID da sua token_orders
    const orderId = String(payment?.external_reference ?? "").trim();
    if (!orderId) {
      return NextResponse.json({ ok: true, ignored: "no_external_reference", mpStatus, mpPaymentId });
    }

    // 1) sempre atualiza MP status e id na order
    await supabase
      .from("token_orders")
      .update({
        mp_status: mpStatus || null,
        mp_payment_id: mpPaymentId,
      })
      .eq("id", orderId);

    // 2) se NÃO aprovado, não marca como pago
    if (mpStatus !== "approved") {
      return NextResponse.json({ ok: true, orderId, mpStatus });
    }

    // 3) aprovado => marca como paid (isso dispara seu TRIGGER que credita tokens)
    //    (idempotente: só troca se ainda não estiver paid)
    const { data: order, error: orderErr } = await supabase
      .from("token_orders")
      .select("id,status")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ ok: true, ignored: "order_not_found", orderId });
    }

    const alreadyPaid = String(order.status || "").toLowerCase() === "paid";
    if (!alreadyPaid) {
      await supabase
        .from("token_orders")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          mp_status: mpStatus || null,
          mp_payment_id: mpPaymentId,
        })
        .eq("id", orderId);
    }

    return NextResponse.json({
      ok: true,
      orderId,
      mpStatus,
      marked_paid: !alreadyPaid,
      token_used: fetched.used,
    });
  } catch (e: any) {
    // mesmo em erro, melhor devolver 200 pro MP (pra não virar loop)
    return NextResponse.json({ ok: true, error: e?.message || "Erro" });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
