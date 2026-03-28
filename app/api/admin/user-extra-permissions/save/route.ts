import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function assertAdmin(req: Request, supabaseAdmin: any) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return { ok: false, status: 401, message: "Não autorizado." };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return { ok: false, status: 401, message: "Não autorizado." };
  }

  const email = String(data.user.email || "").toLowerCase();
  const adminEmail = String(process.env.ADMIN_MASTER_EMAIL || "").toLowerCase();

  if (!adminEmail || email !== adminEmail) {
    return { ok: false, status: 403, message: "Acesso negado." };
  }

  return { ok: true, user: data.user };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const userId = String(body?.user_id || "").trim();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "user_id é obrigatório." }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      env("NEXT_PUBLIC_SUPABASE_URL"),
      env("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } }
    );

    const guard = await assertAdmin(req, supabaseAdmin);
    if (!guard.ok) {
      return NextResponse.json({ ok: false, error: guard.message }, { status: guard.status });
    }

    const payload = {
      user_id: userId,
      can_change_layout: Boolean(body?.can_change_layout),
      can_transfer_sites: Boolean(body?.can_transfer_sites),
      can_view_orders: Boolean(body?.can_view_orders),
      can_manage_suggestions: Boolean(body?.can_manage_suggestions),
      can_use_custom_domain: Boolean(body?.can_use_custom_domain),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from("user_extra_permissions")
      .upsert(payload, { onConflict: "user_id" });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro interno." },
      { status: 500 }
    );
  }
}