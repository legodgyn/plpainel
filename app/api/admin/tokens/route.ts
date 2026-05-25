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

  if (!token) return { ok: false, status: 401, message: "Nao autorizado." };

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return { ok: false, status: 401, message: "Nao autorizado." };

  const email = String(data.user.email || "").toLowerCase();
  const adminEmail = String(process.env.ADMIN_MASTER_EMAIL || "").toLowerCase();
  const publicAdminEmail = String(process.env.NEXT_PUBLIC_ADMIN_MASTER_EMAIL || "").toLowerCase();

  if ((!adminEmail && !publicAdminEmail) || (email !== adminEmail && email !== publicAdminEmail)) {
    return { ok: false, status: 403, message: "Acesso negado." };
  }

  return { ok: true, user: data.user };
}

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

async function getUsers(supabaseAdmin: any) {
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

  const userIds = Array.from(new Set(profileRows.map((p) => p.user_id).filter(Boolean)));

  const emailByUser = new Map<string, string | null>();
  await Promise.all(
    userIds.map(async (uid) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(uid);
      emailByUser.set(uid, data?.user?.email || null);
    })
  );

  const tokensByUser = new Map<string, number>();
  if (userIds.length) {
    const { data: balances } = await supabaseAdmin
      .from("user_token_balances")
      .select("user_id,balance")
      .in("user_id", userIds);

    for (const row of balances || []) {
      tokensByUser.set(row.user_id, Number(row.balance || 0));
    }
  }

  const spentByUser = new Map<string, number>();
  if (userIds.length) {
    const { data: orders } = await supabaseAdmin
      .from("token_orders")
      .select("user_id,total_cents,status")
      .in("user_id", userIds);

    for (const order of orders || []) {
      if (String(order.status || "").toLowerCase() !== "paid") continue;
      spentByUser.set(
        order.user_id,
        (spentByUser.get(order.user_id) || 0) + Number(order.total_cents || 0)
      );
    }
  }

  return profileRows
    .map((profile) => {
      const spent = spentByUser.get(profile.user_id) || 0;

      return {
        user_id: profile.user_id,
        created_at: profile.created_at,
        name: profile.name || null,
        email: emailByUser.get(profile.user_id) || null,
        whatsapp: profile.whatsapp || null,
        token_balance: tokensByUser.get(profile.user_id) || 0,
        total_spent_cents: spent,
        total_spent_label: money(spent),
      };
    })
    .sort((a, b) => {
      const tokenDiff = Number(b.token_balance || 0) - Number(a.token_balance || 0);
      if (tokenDiff !== 0) return tokenDiff;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
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

    return NextResponse.json({ ok: true, users: await getUsers(supabaseAdmin) });
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

    const body = await req.json().catch(() => ({}));
    const userId = String(body.user_id || "").trim();
    const mode = String(body.mode || "").trim();
    const amount = Math.trunc(Number(body.amount || 0));

    if (!userId) {
      return NextResponse.json({ ok: false, error: "Selecione um usuario." }, { status: 400 });
    }

    if (!["add", "remove", "set"].includes(mode)) {
      return NextResponse.json({ ok: false, error: "Acao invalida." }, { status: 400 });
    }

    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ ok: false, error: "Informe uma quantidade valida." }, { status: 400 });
    }

    const { data: currentRow, error: currentErr } = await supabaseAdmin
      .from("user_tokens")
      .select("user_id,balance")
      .eq("user_id", userId)
      .maybeSingle();

    if (currentErr) {
      return NextResponse.json({ ok: false, error: currentErr.message }, { status: 400 });
    }

    const currentBalance = Number(currentRow?.balance || 0);
    const nextBalance =
      mode === "set"
        ? amount
        : mode === "add"
        ? currentBalance + amount
        : Math.max(0, currentBalance - amount);

    const { error: upsertErr } = await supabaseAdmin
      .from("user_tokens")
      .upsert({ user_id: userId, balance: nextBalance }, { onConflict: "user_id" });

    if (upsertErr) {
      return NextResponse.json({ ok: false, error: upsertErr.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      user_id: userId,
      previous_balance: currentBalance,
      balance: nextBalance,
      users: await getUsers(supabaseAdmin),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erro interno." }, { status: 500 });
  }
}
