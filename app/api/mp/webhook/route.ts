import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// ✅ helper de env com erro claro
function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

type MpWebhookPayload =
  | {
      type?: string;
      action?: string;
      data?: { id?: string | number };
    }
  | any;

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as MpWebhookPayload;

    // Mercado Pago pode mandar: {type:"payment", data:{id:"..."}}
    const paymentIdRaw = body?.data?.id;
    const paymentId = paymentIdRaw ? String(paymentIdRaw) : null;

    if (!paymentId) {
      return NextResponse.json({ ok: true, ignored: true, reason: "no_payment_id" });
    }

    // ✅ Supabase (service role)
    const supabase = createClient(
      getEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getEnv("SUPABASE_SERVICE_ROLE_KEY")
    );

    // ✅ Busca no MP o pagamento (usa o token que você estiver usando no ambiente)
    // IMPORTANTe: aqui usamos MP_ACCESS_TOKEN (pode ser LIVE ou TEST)
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${getEnv("MP_ACCESS_TOKEN")}`,
      },
      cache: "no-store",
    });

    if (!mpRes.ok) {
      return NextResponse.json({ ok: true, mp_fetch_failed: true, mp_status: mpRes.status });
    }

    const mpJson: any = await mpRes.json();

    const mpStatus = String(mpJson?.status ?? "unknown");
    const externalReference = String(mpJson?.external_reference ?? "").trim();

    // Se não veio external_reference, não dá pra linkar com order
    if (!externalReference) {
      return NextResponse.json({ ok: true, ignored: true, reason: "no_external_reference", mpStatus });
    }

    // ✅ Carrega order pelo ID que você salvou como external_reference (order.id)
    // Troquei para maybeSingle() + guarda de null pra não quebrar o build
    const { data: order, error: orderErr } = await supabase
      .from("token_orders")
      .select("id,user_id,tokens,status,mp_status,mp_payment_id")
      .eq("id", externalReference)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json({ ok: false, error: "Pedido não encontrado" }, { status: 404 });
    }

    // ✅ idempotência: se já está pago, não faz nada
    if (order.status === "paid") {
      return NextResponse.json({ ok: true, already_paid: true, status: order.status, mp_status: order.mp_status });
    }

    // ✅ Atualiza order com status do MP
    await supabase
      .from("token_orders")
      .update({
        mp_payment_id: String(mpJson?.id ?? paymentId),
        mp_status: mpStatus,
      })
      .eq("id", order.id);

    // ✅ Se pagamento aprovado, credita tokens
    // Status comum do MP: "approved"
    if (mpStatus === "approved") {
      // Marca order como paid
      await supabase.from("token_orders").update({ status: "paid" }).eq("id", order.id);

      // Incrementa balance
      // Observação: sua tabela é public.user_token_balances (user_id, balance)
      // Faz upsert + increment simples
      const { data: balRow } = await supabase
        .from("user_token_balances")
        .select("balance")
        .eq("user_id", order.user_id)
        .maybeSingle();

      const current = Number(balRow?.balance ?? 0);
      const next = current + Number(order.tokens ?? 0);

      await supabase
        .from("user_token_balances")
        .upsert({ user_id: order.user_id, balance: next }, { onConflict: "user_id" });

      // (Opcional) registrar ledger/transações se você já tiver tabela.
      // Se não tiver, ignora.

      return NextResponse.json({ ok: true, status: "paid", mp_status: mpStatus });
    }

    // ✅ Se cancelado/expirado/rejeitado → marca failed/cancelled (ajuste se quiser)
    if (mpStatus === "cancelled" || mpStatus === "rejected" || mpStatus === "expired") {
      await supabase
        .from("token_orders")
        .update({ status: "failed", mp_status: mpStatus })
        .eq("id", order.id);

      return NextResponse.json({ ok: true, status: "failed", mp_status: mpStatus });
    }

    // ✅ Outros casos ficam pending
    await supabase.from("token_orders").update({ status: "pending" }).eq("id", order.id);

    return NextResponse.json({ ok: true, status: "pending", mp_status: mpStatus });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erro" }, { status: 500 });
  }
}
