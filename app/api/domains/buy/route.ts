import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

export async function POST(req: Request) {
  try {
    const token = getBearerToken(req);
    const { domainId } = await req.json();

    if (!token) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    if (!domainId) {
      return NextResponse.json({ ok: false, error: "Domínio obrigatório." }, { status: 400 });
    }

    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const { data: authData, error: authError } = await supabaseUser.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json({ ok: false, error: "Usuário inválido." }, { status: 401 });
    }

    const userId = authData.user.id;

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: balanceRow } = await supabaseAdmin
      .from("domain_coin_balances")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();

    const balance = balanceRow?.balance ?? 0;

    if (balance < 1) {
      return NextResponse.json({ ok: false, error: "Saldo insuficiente de coins." }, { status: 400 });
    }

    const { data: domainRow, error: domainError } = await supabaseAdmin
      .from("available_domains")
      .select("*")
      .eq("id", domainId)
      .eq("status", "available")
      .maybeSingle();

    if (domainError || !domainRow) {
      return NextResponse.json({ ok: false, error: "Domínio indisponível." }, { status: 400 });
    }

    const { error: updateBalanceError } = await supabaseAdmin
      .from("domain_coin_balances")
      .update({
        balance: balance - 1,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updateBalanceError) {
      return NextResponse.json({ ok: false, error: updateBalanceError.message }, { status: 500 });
    }

    const { error: updateDomainError } = await supabaseAdmin
      .from("available_domains")
      .update({
        status: "sold",
        assigned_user_id: userId,
        assigned_at: new Date().toISOString(),
      })
      .eq("id", domainId)
      .eq("status", "available");

    if (updateDomainError) {
      return NextResponse.json({ ok: false, error: updateDomainError.message }, { status: 500 });
    }

    await supabaseAdmin.from("domain_coin_transactions").insert({
      user_id: userId,
      amount: -1,
      type: "domain_purchase",
      description: `Compra do domínio ${domainRow.domain}`,
    });

    return NextResponse.json({
      ok: true,
      domain: domainRow.domain,
      balance: balance - 1,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Erro ao comprar domínio." },
      { status: 500 }
    );
  }
}