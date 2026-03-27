import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEvolutionText } from "@/lib/evolution";

export const dynamic = "force-dynamic";

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token || token !== process.env.INTERNAL_AUTOMATION_TOKEN) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({} as any));
    const orderId = String(body?.order_id || "").trim();

    if (!orderId) {
      return NextResponse.json({ ok: false, error: "order_id é obrigatório." }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      env("NEXT_PUBLIC_SUPABASE_URL"),
      env("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } }
    );

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("token_orders")
      .select("id,user_id,total_cents,status")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ ok: false, error: "Pedido não encontrado." }, { status: 404 });
    }

    if (String(order.status || "").toLowerCase() !== "paid") {
      return NextResponse.json({
        ok: false,
        error: "Pedido ainda não está pago.",
      }, { status: 400 });
    }

    const eventKey = `order_paid_${order.id}`;

    // evita enviar duplicado
    const { data: alreadySent } = await supabaseAdmin
      .from("whatsapp_automation_logs")
      .select("id")
      .eq("user_id", order.user_id)
      .eq("event_key", eventKey)
      .limit(1);

    if ((alreadySent || []).length > 0) {
      return NextResponse.json({
        ok: true,
        skipped: "already_sent",
        order_id: order.id,
      });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("name,whatsapp")
      .eq("user_id", order.user_id)
      .maybeSingle();

    if (!profile?.whatsapp) {
      return NextResponse.json({
        ok: true,
        skipped: "no_whatsapp",
        order_id: order.id,
      });
    }

    const totalLabel = (Number(order.total_cents || 0) / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    const text =
      `Olá ${profile.name || ""}! ✅\n\n` +
      `Seu pagamento no PL Painel foi confirmado com sucesso.\n\n` +
      `Valor: ${totalLabel}\n\n` +
      `Se precisar de ajuda para usar seus tokens, me chama aqui. 🚀\n\n` +
      `Entre no nosso grupo - https://chat.whatsapp.com/HscyWLc5vEPKL6w6Esopb9`;

    const evolutionResponse = await sendEvolutionText(profile.whatsapp, text);

    await supabaseAdmin.from("whatsapp_automation_logs").insert({
      user_id: order.user_id,
      event_key: eventKey,
      sent_to: profile.whatsapp,
      payload: {
        automation: "order_paid",
        order_id: order.id,
        total_cents: order.total_cents,
      },
    });

    return NextResponse.json({
      ok: true,
      order_id: order.id,
      whatsapp: profile.whatsapp,
      evolution: evolutionResponse,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro interno." },
      { status: 500 }
    );
  }
}
