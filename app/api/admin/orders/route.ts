import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

// 🔒 Troque isso pela sua regra de "admin master"
// Exemplo simples: libera só seu email
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
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function normalizeStatus(s: string) {
  const v = String(s || "").toLowerCase();
  if (v === "paid") return { label: "Pago", key: "paid" };
  if (v === "pending") return { label: "Pendente", key: "pending" };
  if (v === "failed") return { label: "Falhou", key: "failed" };
  if (v === "canceled" || v === "cancelled") return { label: "Cancelado", key: "canceled" };
  if (v === "refunded") return { label: "Estornado", key: "refunded" };
  return { label: s, key: v };
}

export async function GET(req: Request) {
  try {
    const supabaseAdmin = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false },
    });

    // ✅ valida admin
    const guard = await assertAdmin(req, supabaseAdmin);
    if (!guard.ok) return NextResponse.json({ ok: false, error: guard.message }, { status: guard.status });

    // ✅ pedidos (NÃO usa buyer_email!)
    const { data: orders, error: ordersErr } = await supabaseAdmin
      .from("token_orders")
      .select("id,user_id,total_cents,status,created_at,mp_payment_id,mp_status") // ajuste se tiver campos diferentes
      .order("created_at", { ascending: false })
      .limit(200);

    if (ordersErr) {
      return NextResponse.json({ ok: false, error: ordersErr.message }, { status: 400 });
    }

    const rows = (orders || []) as Array<{
      id: string;
      user_id: string;
      total_cents: number;
      status: string;
      created_at: string;
      mp_payment_id: string | null;
      mp_status: string | null;
    }>;

    // ✅ mapear afiliado por referred_user_id -> referrals.code
    const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));

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

    // ✅ pegar email do comprador (de verdade) via auth admin API
    const emailByUser = new Map<string, string | null>();
    await Promise.all(
      userIds.map(async (uid) => {
        const { data } = await supabaseAdmin.auth.admin.getUserById(uid);
        emailByUser.set(uid, data?.user?.email || null);
      })
    );

    const out = rows.map((o) => {
      const st = normalizeStatus(o.status);
      return {
        id: o.id,
        created_at: o.created_at,
        user_id: o.user_id,
        email: emailByUser.get(o.user_id) || null,
        total_cents: Number(o.total_cents || 0),
        total_label: money(Number(o.total_cents || 0)),
        status: st.key,
        status_label: st.label,
        affiliate_code: affiliateByUser.get(o.user_id) || null,
        mp_payment_id: o.mp_payment_id || null,
        mp_status: o.mp_status || null,
      };
    });

    const totalReceivedCents = out
      .filter((x) => x.status === "paid")
      .reduce((acc, x) => acc + (x.total_cents || 0), 0);

    return NextResponse.json({
      ok: true,
      total_received_cents: totalReceivedCents,
      total_received_label: money(totalReceivedCents),
      orders: out,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erro" }, { status: 500 });
  }
}