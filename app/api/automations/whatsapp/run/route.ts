import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEvolutionText } from "@/lib/evolution";

export const dynamic = "force-dynamic";

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function isPaid(status: string | null | undefined) {
  return String(status || "").toLowerCase() === "paid";
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");

    if (secret !== process.env.WHATSAPP_AUTOMATION_SECRET) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      env("NEXT_PUBLIC_SUPABASE_URL"),
      env("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } }
    );

    const results: any[] = [];

    // =========================================================
    // 1) USUÁRIO CRIOU CONTA E NÃO COMPROU EM 1 DIA
    // =========================================================
    const { data: profiles, error: profilesErr } = await supabaseAdmin
      .from("profiles")
      .select("user_id,name,whatsapp,created_at");

    if (profilesErr) throw new Error(profilesErr.message);

    const profileRows =
      (profiles as Array<{
        user_id: string;
        name: string | null;
        whatsapp: string | null;
        created_at: string | null;
      }>) || [];

    for (const user of profileRows) {
      if (!user.whatsapp || !user.created_at) continue;

      const createdAt = new Date(user.created_at);
      if (createdAt > daysAgo(1)) continue;

      const { data: paidOrders } = await supabaseAdmin
        .from("token_orders")
        .select("id,status")
        .eq("user_id", user.user_id);

      const hasPaidOrder = (paidOrders || []).some((o: any) => isPaid(o.status));
      if (hasPaidOrder) continue;

      const { data: alreadySent } = await supabaseAdmin
        .from("whatsapp_automation_logs")
        .select("id")
        .eq("user_id", user.user_id)
        .eq("event_key", "account_created_no_purchase_1d")
        .limit(1);

      if ((alreadySent || []).length > 0) continue;

      const text =
        `Olá ${user.name || ""}! 👋\n\n` +
        `Vi que você criou uma conta no PL Painel, mas ainda não fez sua primeira compra.\n\n` +
        `Se quiser, posso te ajudar a começar e criar seu primeiro site e VERIFICAR sua BM em tempo recorde. 🚀`;

      await sendEvolutionText(user.whatsapp, text);

      await supabaseAdmin.from("whatsapp_automation_logs").insert({
        user_id: user.user_id,
        event_key: "account_created_no_purchase_1d",
        sent_to: user.whatsapp,
        payload: { automation: "account_created_no_purchase_1d" },
      });

      results.push({
        user_id: user.user_id,
        event: "account_created_no_purchase_1d",
        whatsapp: user.whatsapp,
      });
    }

    // =========================================================
    // 2) TOKENS ZERADOS
    // =========================================================
    const { data: tokenBalances, error: tokenErr } = await supabaseAdmin
      .from("user_tokens")
      .select("user_id,balance");

    if (tokenErr) throw new Error(tokenErr.message);

    for (const row of tokenBalances || []) {
      if (Number(row.balance || 0) > 0) continue;

      const { data: alreadySent } = await supabaseAdmin
        .from("whatsapp_automation_logs")
        .select("id,created_at")
        .eq("user_id", row.user_id)
        .eq("event_key", "tokens_zero")
        .order("created_at", { ascending: false })
        .limit(1);

      // evita mandar toda hora
      if ((alreadySent || []).length > 0) {
        const last = new Date(alreadySent![0].created_at);
        if (last > daysAgo(7)) continue;
      }

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("name,whatsapp")
        .eq("user_id", row.user_id)
        .maybeSingle();

      if (!profile?.whatsapp) continue;

      const text =
        `Olá ${profile.name || ""}! ⚠️\n\n` +
        `Seus tokens no PL Painel acabaram.\n\n` +
        `Quando quiser continuar criando sites e usando a plataforma, é só recarregar ou, se tiver alguma dúvida, estamos prontos para ajudar você! 🚀`;

      await sendEvolutionText(profile.whatsapp, text);

      await supabaseAdmin.from("whatsapp_automation_logs").insert({
        user_id: row.user_id,
        event_key: "tokens_zero",
        sent_to: profile.whatsapp,
        payload: { automation: "tokens_zero" },
      });

      results.push({
        user_id: row.user_id,
        event: "tokens_zero",
        whatsapp: profile.whatsapp,
      });
    }

    return NextResponse.json({
      ok: true,
      total_sent: results.length,
      results,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro interno." },
      { status: 500 }
    );
  }
}
