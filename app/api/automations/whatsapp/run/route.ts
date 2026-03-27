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

async function reserveLog(
  supabaseAdmin: any,
  userId: string,
  eventKey: string,
  sentTo: string,
  payload: Record<string, any>
) {
  return await supabaseAdmin.from("whatsapp_automation_logs").insert({
    user_id: userId,
    event_key: eventKey,
    sent_to: sentTo,
    payload: {
      ...payload,
      status: "reserved",
    },
  });
}

async function markLogSent(
  supabaseAdmin: any,
  userId: string,
  eventKey: string,
  payload: Record<string, any>
) {
  return await supabaseAdmin
    .from("whatsapp_automation_logs")
    .update({
      payload: {
        ...payload,
        status: "sent",
      },
    })
    .eq("user_id", userId)
    .eq("event_key", eventKey);
}

async function markLogFailed(
  supabaseAdmin: any,
  userId: string,
  eventKey: string,
  payload: Record<string, any>,
  errorMessage: string
) {
  return await supabaseAdmin
    .from("whatsapp_automation_logs")
    .update({
      payload: {
        ...payload,
        status: "failed",
        error: errorMessage,
      },
    })
    .eq("user_id", userId)
    .eq("event_key", eventKey);
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
      if (!user.whatsapp || !user.created_at) {
        results.push({
          user_id: user.user_id,
          event: "account_created_no_purchase_1d",
          skipped: "missing_whatsapp_or_created_at",
        });
        continue;
      }

      const createdAt = new Date(user.created_at);
      if (createdAt > daysAgo(1)) {
        results.push({
          user_id: user.user_id,
          event: "account_created_no_purchase_1d",
          skipped: "account_too_new",
        });
        continue;
      }

      const { data: paidOrders, error: paidOrdersErr } = await supabaseAdmin
        .from("token_orders")
        .select("id,status")
        .eq("user_id", user.user_id);

      if (paidOrdersErr) throw new Error(paidOrdersErr.message);

      const hasPaidOrder = (paidOrders || []).some((o: any) => isPaid(o.status));
      if (hasPaidOrder) {
        results.push({
          user_id: user.user_id,
          event: "account_created_no_purchase_1d",
          skipped: "has_paid_order",
        });
        continue;
      }

      const eventKey = "account_created_no_purchase_1d";

      const { error: reserveErr } = await reserveLog(
        supabaseAdmin,
        user.user_id,
        eventKey,
        user.whatsapp,
        { automation: eventKey }
      );

      if (reserveErr) {
        results.push({
          user_id: user.user_id,
          event: eventKey,
          skipped: "already_sent_or_reserved",
        });
        continue;
      }

      try {
        const text =
          `Olá ${user.name || ""}! 👋\n\n` +
          `Vi que você criou uma conta no *PL Painel*, mas ainda não fez sua primeira compra.\n\n` +
          `Se quiser, posso te ajudar a começar e criar seu primeiro site e VERIFICAR sua BM em tempo recorde. 🚀\n\n` +
          `Entre no nosso grupo - https://chat.whatsapp.com/HscyWLc5vEPKL6w6Esopb9`;

        await sendEvolutionText(user.whatsapp, text);

        await markLogSent(supabaseAdmin, user.user_id, eventKey, {
          automation: eventKey,
        });

        results.push({
          user_id: user.user_id,
          event: eventKey,
          whatsapp: user.whatsapp,
        });
      } catch (sendErr: any) {
        await markLogFailed(
          supabaseAdmin,
          user.user_id,
          eventKey,
          { automation: eventKey },
          sendErr?.message || "send_failed"
        );

        results.push({
          user_id: user.user_id,
          event: eventKey,
          skipped: "send_failed",
          error: sendErr?.message || "send_failed",
        });
      }
    }

    // =========================================================
    // 2) TOKENS ZERADOS
    // =========================================================
    const { data: tokenBalances, error: tokenErr } = await supabaseAdmin
      .from("user_token_balances")
      .select("user_id,balance");

    if (tokenErr) throw new Error(tokenErr.message);

    for (const row of tokenBalances || []) {
      if (Number(row.balance || 0) > 0) {
        results.push({
          user_id: row.user_id,
          event: "tokens_zero",
          skipped: "has_balance",
        });
        continue;
      }

      const { data: profile, error: profileErr } = await supabaseAdmin
        .from("profiles")
        .select("name,whatsapp")
        .eq("user_id", row.user_id)
        .maybeSingle();

      if (profileErr) throw new Error(profileErr.message);

      if (!profile?.whatsapp) {
        results.push({
          user_id: row.user_id,
          event: "tokens_zero",
          skipped: "no_whatsapp",
        });
        continue;
      }

      const { data: alreadySent, error: alreadySentErr } = await supabaseAdmin
        .from("whatsapp_automation_logs")
        .select("id,created_at")
        .eq("user_id", row.user_id)
        .eq("event_key", "tokens_zero")
        .order("created_at", { ascending: false })
        .limit(1);

      if (alreadySentErr) throw new Error(alreadySentErr.message);

      if ((alreadySent || []).length > 0) {
        const last = new Date(alreadySent[0].created_at);
        if (last > daysAgo(7)) {
          results.push({
            user_id: row.user_id,
            event: "tokens_zero",
            skipped: "sent_recently",
          });
          continue;
        }
      }

      const eventKey = "tokens_zero";

      const { error: reserveErr } = await reserveLog(
        supabaseAdmin,
        row.user_id,
        eventKey,
        profile.whatsapp,
        { automation: eventKey }
      );

      if (reserveErr) {
        results.push({
          user_id: row.user_id,
          event: eventKey,
          skipped: "already_sent_or_reserved",
        });
        continue;
      }

      try {
        const text =
          `Olá ${profile.name || ""}! ⚠️\n\n` +
          `Seus tokens no *PL Painel* acabaram.\n\n` +
          `Quando quiser continuar criando sites e usando a plataforma, é só recarregar, ou se tiver alguma dúvida, estamos prontos para ajudar você! 🚀\n\n` +
          `Entre no nosso grupo - https://chat.whatsapp.com/HscyWLc5vEPKL6w6Esopb9`;

        await sendEvolutionText(profile.whatsapp, text);

        await markLogSent(supabaseAdmin, row.user_id, eventKey, {
          automation: eventKey,
        });

        results.push({
          user_id: row.user_id,
          event: eventKey,
          whatsapp: profile.whatsapp,
        });
      } catch (sendErr: any) {
        await markLogFailed(
          supabaseAdmin,
          row.user_id,
          eventKey,
          { automation: eventKey },
          sendErr?.message || "send_failed"
        );

        results.push({
          user_id: row.user_id,
          event: eventKey,
          skipped: "send_failed",
          error: sendErr?.message || "send_failed",
        });
      }
    }

    // =========================================================
    // 3) ÚLTIMA COMPRA PAGA HÁ MAIS DE 30 DIAS
    // =========================================================
    for (const user of profileRows) {
      if (!user.whatsapp) {
        results.push({
          user_id: user.user_id,
          event: "repurchase_30d",
          skipped: "no_whatsapp",
        });
        continue;
      }

      const { data: paidOrders, error: paidOrdersErr } = await supabaseAdmin
        .from("token_orders")
        .select("id,status,created_at")
        .eq("user_id", user.user_id)
        .eq("status", "paid")
        .order("created_at", { ascending: false });

      if (paidOrdersErr) throw new Error(paidOrdersErr.message);

      if (!paidOrders || paidOrders.length === 0) {
        results.push({
          user_id: user.user_id,
          event: "repurchase_30d",
          skipped: "no_paid_orders",
        });
        continue;
      }

      const lastPaidOrder = paidOrders[0];
      const lastPaidAt = new Date(lastPaidOrder.created_at);

      if (lastPaidAt > daysAgo(30)) {
        results.push({
          user_id: user.user_id,
          event: "repurchase_30d",
          skipped: "last_purchase_too_recent",
        });
        continue;
      }

      const { data: alreadySent, error: alreadySentErr } = await supabaseAdmin
        .from("whatsapp_automation_logs")
        .select("id,created_at")
        .eq("user_id", user.user_id)
        .eq("event_key", "repurchase_30d")
        .order("created_at", { ascending: false })
        .limit(1);

      if (alreadySentErr) throw new Error(alreadySentErr.message);

      if ((alreadySent || []).length > 0) {
        const last = new Date(alreadySent[0].created_at);
        if (last > daysAgo(30)) {
          results.push({
            user_id: user.user_id,
            event: "repurchase_30d",
            skipped: "sent_recently",
          });
          continue;
        }
      }

      const eventKey = "repurchase_30d";

      const { error: reserveErr } = await reserveLog(
        supabaseAdmin,
        user.user_id,
        eventKey,
        user.whatsapp,
        {
          automation: eventKey,
          last_paid_order_id: lastPaidOrder.id,
          last_paid_at: lastPaidOrder.created_at,
        }
      );

      if (reserveErr) {
        results.push({
          user_id: user.user_id,
          event: eventKey,
          skipped: "already_sent_or_reserved",
        });
        continue;
      }

      try {
        const text =
          `Olá ${user.name || ""}! 👋\n\n` +
          `Já faz um tempo desde sua última compra no *PL Painel*.\n\n` +
          `Se quiser voltar a criar sites, verificar BM's e usar a plataforma, me chama aqui que posso te ajudar a retomar e verificar sua BM em tempo recorde. 🚀\n\n` +
          `Entre no nosso grupo - https://chat.whatsapp.com/HscyWLc5vEPKL6w6Esopb9`;

        await sendEvolutionText(user.whatsapp, text);

        await markLogSent(supabaseAdmin, user.user_id, eventKey, {
          automation: eventKey,
          last_paid_order_id: lastPaidOrder.id,
          last_paid_at: lastPaidOrder.created_at,
        });

        results.push({
          user_id: user.user_id,
          event: eventKey,
          whatsapp: user.whatsapp,
        });
      } catch (sendErr: any) {
        await markLogFailed(
          supabaseAdmin,
          user.user_id,
          eventKey,
          {
            automation: eventKey,
            last_paid_order_id: lastPaidOrder.id,
            last_paid_at: lastPaidOrder.created_at,
          },
          sendErr?.message || "send_failed"
        );

        results.push({
          user_id: user.user_id,
          event: eventKey,
          skipped: "send_failed",
          error: sendErr?.message || "send_failed",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      total_sent: results.filter((r) => !r.skipped).length,
      total_processed: results.length,
      results,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro interno." },
      { status: 500 }
    );
  }
}
