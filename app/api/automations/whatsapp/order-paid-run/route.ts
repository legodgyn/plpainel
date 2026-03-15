import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEvolutionText } from "@/lib/evolution";

export const dynamic = "force-dynamic";

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function isPaid(status: string | null | undefined) {
  return String(status || "").toLowerCase() === "paid";
}

function minutesAgo(minutes: number) {
  const d = new Date();
  d.setMinutes(d.getMinutes() - minutes);
  return d.toISOString();
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");

    if (secret !== process.env.WHATSAPP_AUTOMATION_SECRET) {
      return NextResponse.json(
        { ok: false, error: "Não autorizado." },
        { status: 401 }
      );
    }

    const supabaseAdmin = createClient(
      env("NEXT_PUBLIC_SUPABASE_URL"),
      env("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } }
    );

    // últimos pedidos pagos (ajuste a janela se quiser)
    const { data: orders, error: ordersErr } = await supabaseAdmin
      .from("token_orders")
      .select("id,user_id,total_cents,status,created_at")
      .gte("created_at", minutesAgo(1440)) // últimas 24h
      .order("created_at", { ascending: false })
      .limit(300);

    if (ordersErr) {
      throw new Error(ordersErr.message);
    }

    const results: any[] = [];

    for (const order of orders || []) {
      if (!isPaid(order.status)) continue;

      const eventKey = `order_paid_${order.id}`;

      const { data: alreadySent, error: sentErr } = await supabaseAdmin
        .from("whatsapp_automation_logs")
        .select("id")
        .eq("user_id", order.user_id)
        .eq("event_key", eventKey)
        .limit(1);

      if (sentErr) {
        throw new Error(sentErr.message);
      }

      if ((alreadySent || []).length > 0) continue;

      const { data: profile, error: profileErr } = await supabaseAdmin
        .from("profiles")
        .select("name,whatsapp")
        .eq("user_id", order.user_id)
        .maybeSingle();

      if (profileErr) {
        throw new Error(profileErr.message);
      }

      if (!profile?.whatsapp) {
        results.push({
          order_id: order.id,
          skipped: "no_whatsapp",
        });
        continue;
      }

      const totalLabel = (Number(order.total_cents || 0) / 100).toLocaleString(
        "pt-BR",
        {
          style: "currency",
          currency: "BRL",
        }
      );

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
          automation: "order_paid_run",
          order_id: order.id,
          total_cents: order.total_cents,
        },
      });

      results.push({
        order_id: order.id,
        whatsapp: profile.whatsapp,
        evolution: evolutionResponse,
      });
    }

    return NextResponse.json({
      ok: true,
      total_sent: results.filter((r) => !r.skipped).length,
      total_checked: (orders || []).length,
      results,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro interno." },
      { status: 500 }
    );
  }
}