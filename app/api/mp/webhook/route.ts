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

function extractPaymentId(body: any) {
  const a = String(body?.data?.id ?? "").trim();
  if (a) return a;

  const b = String(body?.id ?? "").trim();
  if (b) return b;

  const r = String(body?.resource ?? "").trim();
  if (r) {
    const m = r.match(/\/payments\/(\d+)/);
    if (m?.[1]) return m[1];
    if (/^\d+$/.test(r)) return r;
  }

  return "";
}

async function fetchPayment(paymentId: string) {
  const prod = optEnv("MP_ACCESS_TOKEN");
  const test = optEnv("MP_ACCESS_TOKEN_TEST");

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

async function triggerOrderPaidWhatsapp(orderId: string) {
  const siteUrl = optEnv("APP_URL") || optEnv("NEXT_PUBLIC_APP_URL");
  const internalToken = optEnv("INTERNAL_AUTOMATION_TOKEN");

  if (!siteUrl || !internalToken || !orderId) {
    console.log("triggerOrderPaidWhatsapp skipped:", {
      hasSiteUrl: !!siteUrl,
      hasInternalToken: !!internalToken,
      orderId,
    });
    return;
  }

  try {
    const res = await fetch(`${siteUrl}/api/automations/whatsapp/order-paid`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${internalToken}`,
      },
      body: JSON.stringify({
        order_id: orderId,
      }),
      cache: "no-store",
    });

    const text = await res.text();
    console.log("triggerOrderPaidWhatsapp response:", res.status, text);
  } catch (err) {
    console.error("triggerOrderPaidWhatsapp error:", err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const paymentId = extractPaymentId(body);

    if (!paymentId) {
      return NextResponse.json({ ok: true, ignored: "no_payment_id" });
    }

    const supabase = createClient(
      env("NEXT_PUBLIC_SUPABASE_URL"),
      env("SUPABASE_SERVICE_ROLE_KEY")
    );

    const fetched = await fetchPayment(paymentId);
    if (!fetched) {
      return NextResponse.json({ ok: true, mp_fetch_failed: true, paymentId });
    }

    const payment = fetched.payment;

    const mpStatus = String(payment?.status ?? "").trim().toLowerCase();
    const mpPaymentId = String(payment?.id ?? paymentId).trim();

    const orderId = String(payment?.external_reference ?? "").trim();
    if (!orderId) {
      return NextResponse.json({
        ok: true,
        ignored: "no_external_reference",
        mpStatus,
        mpPaymentId,
      });
    }

    await supabase
      .from("token_orders")
      .update({
        mp_status: mpStatus || null,
        mp_payment_id: mpPaymentId,
      })
      .eq("id", orderId);

    if (mpStatus !== "approved") {
      return NextResponse.json({ ok: true, orderId, mpStatus });
    }

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

      await triggerOrderPaidWhatsapp(orderId);
    }

    return NextResponse.json({
      ok: true,
      orderId,
      mpStatus,
      marked_paid: !alreadyPaid,
      whatsapp_order_paid_triggered: !alreadyPaid,
      token_used: fetched.used,
    });
  } catch (e: any) {
    console.error("MP webhook error:", e);
    return NextResponse.json({ ok: true, error: e?.message || "Erro" });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
