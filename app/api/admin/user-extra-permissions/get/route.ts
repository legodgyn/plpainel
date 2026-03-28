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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = String(url.searchParams.get("user_id") || "").trim();

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

    const { data, error } = await supabaseAdmin
      .from("user_extra_permissions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      permissions: data || {
        user_id: userId,
        can_change_layout: false,
        can_transfer_sites: false,
        can_view_orders: false,
        can_manage_suggestions: false,
        can_use_custom_domain: false,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro interno." },
      { status: 500 }
    );
  }
}