import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

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

  const email = (data.user.email || "").toLowerCase();
  const MASTER = (process.env.ADMIN_MASTER_EMAIL || "").toLowerCase();

  if (!MASTER || email !== MASTER) {
    return { ok: false, status: 403, message: "Acesso negado." };
  }

  return { ok: true, user: data.user };
}

export async function GET(req: Request) {
  try {
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
      .from("system_settings")
      .select("value")
      .eq("key", "maintenance_banner")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      data: data?.value || {
        enabled: false,
        message:
          "Nosso sistema está em manutenção temporária. Algumas funções podem apresentar instabilidade.",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erro interno." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createClient(
      env("NEXT_PUBLIC_SUPABASE_URL"),
      env("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } }
    );

    const guard = await assertAdmin(req, supabaseAdmin);
    if (!guard.ok) {
      return NextResponse.json({ ok: false, error: guard.message }, { status: guard.status });
    }

    const body = await req.json().catch(() => ({} as any));

    const enabled = Boolean(body?.enabled);
    const message =
      String(body?.message || "").trim() ||
      "Nosso sistema está em manutenção temporária. Algumas funções podem apresentar instabilidade.";

    const { error } = await supabaseAdmin.from("system_settings").upsert(
      {
        key: "maintenance_banner",
        value: {
          enabled,
          message,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      data: { enabled, message },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erro interno." }, { status: 500 });
  }
}