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

async function fetchPayment(paymentId: string) {
  const prod = optEnv("MP_ACCESS_TOKEN");
  const test = optEnv("MP_ACCESS_TOKEN_TEST");

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

    const supabase = createClient(
      env("NEXT_PUBLIC_SUPABASE_URL"),
      env("SUPABASE_SERVICE_ROLE_KEY")
    );

    const fetched = await fetchPayment(paymentId);
    if (!fetched) return NextResponse.json({ ok: true, mp_fetch_failed: true, paymentId });

    const payment = fetched.payment;
    const mpStatus = String(payment?.status ?? "");
    const orderId = String(payment?.external_reference ?? "").trim();

    if (!orderId) return NextResponse.json({ ok: true, ignored: "no_external_reference" });

    // sempre grava status do MP
    await supabase
      .from("token_orders")
      .update({
        mp_status: mpStatus || null,
        mp_payment_id: String(payment?.id ?? paymentId),
      })
      .eq("id", orderId);

    // só “finaliza” quando aprovado
    if (mpStatus !== "approved") {
      return NextResponse.json({ ok: true, status: mpStatus });
    }

    // marca como paga (o trigger do banco credita tokens)
    await supabase
      .from("token_orders")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .neq("status", "paid"); // idempotência

    return NextResponse.json({ ok: true, status: "approved", token_used: fetched.used });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erro" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
