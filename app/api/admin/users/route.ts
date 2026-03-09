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
  return `https://wa.me/55${digits.length <= 11 ? digits : digits}`;
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

    // profiles
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

    const userIds = Array.from(
      new Set(profileRows.map((p) => p.user_id).filter(Boolean))
    );

    // emails do auth
    const emailByUser = new Map<string, string | null>();
    await Promise.all(
      userIds.map(async (uid) => {
        const { data } = await supabaseAdmin.auth.admin.getUserById(uid);
        emailByUser.set(uid, data?.user?.email || null);
      })
    );

    // afiliado
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

    // total gasto
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

    const out = profileRows
      .map((p) => {
        const spent = spentByUser.get(p.user_id) || 0;
        return {
          user_id: p.user_id,
          created_at: p.created_at,
          email: emailByUser.get(p.user_id) || null,
          name: p.name || null,
          whatsapp: p.whatsapp || null,
          whatsapp_link: waLink(p.whatsapp),
          affiliate_code: affiliateByUser.get(p.user_id) || null,
          total_spent_cents: spent,
          total_spent_label: money(spent),
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