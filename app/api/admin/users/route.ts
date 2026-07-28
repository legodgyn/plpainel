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

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function waLink(phone?: string | null) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits.startsWith("55") ? digits : `55${digits}`}`;
}

async function listAuthUsers(supabaseAdmin: any) {
  const users: Array<{
    id: string;
    email: string | null;
    created_at: string | null;
  }> = [];
  const perPage = 1000;

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) throw new Error(error.message);

    const batch = data?.users || [];
    users.push(
      ...batch.map((user: any) => ({
        id: user.id,
        email: user.email || null,
        created_at: user.created_at || null,
      }))
    );

    if (batch.length < perPage) break;
  }

  return users;
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
      return NextResponse.json(
        { ok: false, error: guard.message },
        { status: guard.status }
      );
    }

    const { data: profiles, error: profilesErr } = await supabaseAdmin
      .from("profiles")
      .select("user_id,name,whatsapp,created_at");

    if (profilesErr) {
      return NextResponse.json(
        { ok: false, error: profilesErr.message },
        { status: 400 }
      );
    }

    const profileRows =
      (profiles as Array<{
        user_id: string;
        name: string | null;
        whatsapp: string | null;
        created_at: string | null;
      }>) || [];

    const authUsers = await listAuthUsers(supabaseAdmin);

    const profileByUser = new Map<string, (typeof profileRows)[number]>();
    for (const profile of profileRows) {
      if (profile.user_id) profileByUser.set(profile.user_id, profile);
    }

    const emailByUser = new Map<string, string | null>();
    const createdAtByUser = new Map<string, string | null>();

    for (const user of authUsers) {
      emailByUser.set(user.id, user.email);
      createdAtByUser.set(user.id, user.created_at);
    }

    const userIds = Array.from(
      new Set([
        ...authUsers.map((user) => user.id),
        ...profileRows.map((p) => p.user_id).filter(Boolean),
      ])
    );

    const missingEmailIds = userIds.filter((uid) => !emailByUser.has(uid));
    await Promise.all(
      missingEmailIds.map(async (uid) => {
        const { data } = await supabaseAdmin.auth.admin.getUserById(uid);
        emailByUser.set(uid, data?.user?.email || null);
        createdAtByUser.set(uid, data?.user?.created_at || null);
      })
    );

    const affiliateByUser = new Map<string, string | null>();
    if (userIds.length) {
      const { data: refs } = await supabaseAdmin
        .from("referrals")
        .select("referred_user_id,code")
        .in("referred_user_id", userIds);

      for (const r of refs || []) {
        affiliateByUser.set(r.referred_user_id, r.code || null);
      }
    }

    const spentByUser = new Map<string, number>();
    if (userIds.length) {
      const { data: orders } = await supabaseAdmin
        .from("token_orders")
        .select("user_id,total_cents,status")
        .in("user_id", userIds);

      for (const o of orders || []) {
        const status = String(o.status || "").toLowerCase();
        if (status !== "paid") continue;

        const prev = spentByUser.get(o.user_id) || 0;
        spentByUser.set(o.user_id, prev + Number(o.total_cents || 0));
      }
    }

    const tokensByUser = new Map<string, number>();
    if (userIds.length) {
      const { data: balances } = await supabaseAdmin
        .from("user_token_balances")
        .select("user_id,balance")
        .in("user_id", userIds);

      for (const b of balances || []) {
        tokensByUser.set(b.user_id, Number(b.balance || 0));
      }
    }

    const out = userIds
      .map((userId) => {
        const profile = profileByUser.get(userId);
        const spent = spentByUser.get(userId) || 0;
        const tokenBalance = tokensByUser.get(userId) || 0;

        return {
          user_id: userId,
          created_at: profile?.created_at || createdAtByUser.get(userId) || null,
          email: emailByUser.get(userId) || null,
          name: profile?.name || null,
          whatsapp: profile?.whatsapp || null,
          whatsapp_link: waLink(profile?.whatsapp),
          affiliate_code: affiliateByUser.get(userId) || null,
          total_spent_cents: spent,
          total_spent_label: money(spent),
          token_balance: tokenBalance,
        };
      })
      .sort((a, b) => {
        const da = new Date(a.created_at || 0).getTime();
        const db = new Date(b.created_at || 0).getTime();
        return db - da;
      });

    return NextResponse.json({
      ok: true,
      users: out,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro" },
      { status: 500 }
    );
  }
}
