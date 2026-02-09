import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function POST(req: Request) {
  try {
    const { tokens } = await req.json();

    const qty = Number(tokens);
    if (!Number.isFinite(qty) || qty < 5) {
      return NextResponse.json({ error: "Compra mínima: 5 tokens" }, { status: 400 });
    }

    // Service role no backend
    const supabase = createClient(
      getEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getEnv("SUPABASE_SERVICE_ROLE_KEY")
    );

    // Auth via header (Bearer)
    const authHeader = req.headers.get("authorization") || "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!jwt) return NextResponse.json({ error: "Sem token de auth" }, { status: 401 });

    const { data: userRes, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userRes?.user) {
      return NextResponse.json({ error: "Usuário não autenticado" }, { status: 401 });
    }

    const user = userRes.user;

    const unitPriceCents = 400;
    const totalCents = qty * unitPriceCents;
    const total = totalCents / 100;

    // ✅ NGROK (LOCAL): notification_url precisa ser HTTPS válido
    const notificationUrl =
      "https://florrie-pregame-sagittally.ngrok-free.dev/api/mp/webhook";

    // cria order (pending)
    const { data: order, error: orderErr } = await supabase
      .from("token_orders")
      .insert({
        user_id: user.id,
        tokens: qty,
        unit_price_cents: unitPriceCents,
        total_cents: totalCents,
        provider: "mercadopago",
        status: "pending",
      })
      .select("id")
      .single();

    if (orderErr || !order?.id) {
      return NextResponse.json({ error: orderErr?.message || "Erro ao criar order" }, { status: 500 });
    }

    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getEnv("MP_ACCESS_TOKEN")}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": order.id,
      },
      body: JSON.stringify({
        transaction_amount: total,
        description: `${qty} tokens - plpainel.com`,
        payment_method_id: "pix",
        payer: { email: user.email },
        notification_url: notificationUrl,
        external_reference: order.id,
      }),
    });

    const mpJson = await mpRes.json();

    if (!mpRes.ok) {
      await supabase
        .from("token_orders")
        .update({ status: "failed", mp_status: "error" })
        .eq("id", order.id);

      return NextResponse.json({ error: "Mercado Pago erro", details: mpJson }, { status: 500 });
    }

    const paymentId = String(mpJson.id ?? "");
    const status = String(mpJson.status ?? "pending");

    const tx = mpJson?.point_of_interaction?.transaction_data;
    const qrBase64 = tx?.qr_code_base64 ?? null;
    const qrCode = tx?.qr_code ?? null;
    const copyPaste = tx?.qr_code ?? null;

    await supabase
      .from("token_orders")
      .update({
        mp_payment_id: paymentId || null,
        mp_status: status,
        mp_qr_base64: qrBase64,
        mp_qr_code: qrCode,
        mp_pix_copy_paste: copyPaste,
      })
      .eq("id", order.id);

    return NextResponse.json({
      order_id: order.id,
      mp_payment_id: paymentId,
      status,
      qr_base64: qrBase64,
      qr_code: qrCode,
      pix_copy_paste: copyPaste,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro" }, { status: 500 });
  }
}