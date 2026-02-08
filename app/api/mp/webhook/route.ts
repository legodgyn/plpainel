import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function fetchMpPayment(paymentId: string) {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${getEnv("MP_ACCESS_TOKEN")}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

export async function POST(req: Request) {
  try {
    // MP pode mandar:
    // 1) querystring: ?id=123&topic=payment
    // 2) body: { type: "payment", data: { id: "123" } }
    // 3) body: { id: "123" }
    let paymentId: string | null = null;

    const url = new URL(req.url);
    const qsId = url.searchParams.get("id");
    if (qsId) paymentId = qsId;

    if (!paymentId) {
      const body = await req.json().catch(() => null);
      paymentId = body?.data?.id?.toString?.() || body?.id?.toString?.() || null;
    }

    // Se não veio ID, responde OK (MP pode tentar outro formato)
    if (!paymentId) {
      return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
    }

    const supabase = createClient(
      getEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getEnv("SUPABASE_SERVICE_ROLE_KEY")
    );

    // 1) Fonte da verdade: consulta o pagamento no MP
    const mp = await fetchMpPayment(paymentId);

    // Importante: SEMPRE 200 pro MP (pra evitar loop insano de retries)
    if (!mp.ok) {
      // salva log opcional (não obrigatório)
      return NextResponse.json(
        { ok: true, mp_fetch_failed: true, mp_status: mp.status },
        { status: 200 }
      );
    }

    const mpStatus = String(mp.json?.status ?? "");
    const mpStatusDetail = String(mp.json?.status_detail ?? "");
    const externalRef = String(mp.json?.external_reference ?? ""); // = token_orders.id

    if (!externalRef) {
      return NextResponse.json({ ok: true, no_external_reference: true }, { status: 200 });
    }

    // 2) Atualiza MP fields na order (sempre)
    await supabase
      .from("token_orders")
      .update({
        mp_payment_id: String(mp.json?.id ?? paymentId),
        mp_status: mpStatus,
        mp_status_detail: mpStatusDetail,
      })
      .eq("id", externalRef);

    // 3) Se ainda não aprovou, só retorna OK
    if (mpStatus !== "approved") {
      return NextResponse.json({ ok: true, status: mpStatus }, { status: 200 });
    }

    // 4) Marca como paid (idempotente)
    await supabase
      .from("token_orders")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", externalRef);

    // 5) Credita via RPC FINAL (ledger + balances + credited_at)
    const { error: creditErr } = await supabase.rpc("credit_tokens_from_order", {
      p_order_id: externalRef,
    });

    if (creditErr) {
      // não quebra webhook; só registra erro na order se você tiver essa coluna
      await supabase
        .from("token_orders")
        .update({ credit_error: creditErr.message })
        .eq("id", externalRef);

      return NextResponse.json(
        { ok: true, paid: true, credited: false, credit_error: creditErr.message },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true, paid: true, credited: true }, { status: 200 });
  } catch (e: any) {
    // nunca 500 pro MP
    return NextResponse.json({ ok: true, error: e?.message || "err" }, { status: 200 });
  }
}