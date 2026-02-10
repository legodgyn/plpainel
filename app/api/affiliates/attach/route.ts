import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function POST(req: Request) {
  try {
    const { code } = await req.json();

    const authHeader = req.headers.get("authorization") || "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!jwt) return NextResponse.json({ error: "Sem auth" }, { status: 401 });

    const sb = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

    const { data: userRes, error: userErr } = await sb.auth.getUser(jwt);
    if (userErr || !userRes?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const user = userRes.user;
    const refCode = String(code || "").trim().toLowerCase();
    if (!refCode) return NextResponse.json({ ok: true, ignored: true });

    // Já tem referral? não mexe (primeiro ganha)
    const existing = await sb.from("referrals").select("referred_user_id").eq("referred_user_id", user.id).maybeSingle();
    if (existing.data) return NextResponse.json({ ok: true, already: true });

    // achar afiliado pelo code
    const { data: aff, error: affErr } = await sb
      .from("affiliates")
      .select("user_id, code, is_active")
      .ilike("code", refCode)
      .maybeSingle();

    if (affErr || !aff?.user_id || !aff.is_active) {
      return NextResponse.json({ ok: true, invalid_code: true });
    }

    // anti-auto indicação
    if (aff.user_id === user.id) return NextResponse.json({ ok: true, self_ref: true });

    await sb.from("referrals").insert({
      referred_user_id: user.id,
      affiliate_user_id: aff.user_id,
      code: aff.code,
    });

    return NextResponse.json({ ok: true, attached: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro" }, { status: 500 });
  }
}
