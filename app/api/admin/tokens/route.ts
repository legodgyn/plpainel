import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type OrderRow = Record<string, any>;
type SiteRow = {
  id: string;
  user_id: string;
  company_name: string | null;
  slug: string | null;
  custom_domain: string | null;
  created_at: string | null;
};

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function adminEmails() {
  return [
    process.env.ADMIN_MASTER_EMAIL,
    process.env.NEXT_PUBLIC_ADMIN_MASTER_EMAIL,
    ...(process.env.NEXT_PUBLIC_ADMIN_MASTER_EMAILS || "").split(","),
  ]
    .map((email) => String(email || "").trim().toLowerCase())
    .filter(Boolean);
}

async function assertAdmin(req: Request, supabaseAdmin: any) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) return { ok: false, status: 401, message: "Nao autorizado." };

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return { ok: false, status: 401, message: "Nao autorizado." };

  const email = String(data.user.email || "").toLowerCase();
  const allowedEmails = adminEmails();

  if (!allowedEmails.length || !allowedEmails.includes(email)) {
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

function normalizeOrderStatus(order: OrderRow) {
  const status = String(order.status || "").toLowerCase();
  const mpStatus = String(order.mp_status || "").toLowerCase();
  if ([status, mpStatus].some((value) => value === "paid" || value === "approved")) return "paid";
  if ([status, mpStatus].some((value) => value === "pending" || value === "in_process")) return "pending";
  if ([status, mpStatus].some((value) => value === "refunded")) return "refunded";
  if ([status, mpStatus].some((value) => ["failed", "rejected", "canceled", "cancelled", "expired"].includes(value))) {
    return "failed";
  }
  return status || mpStatus || "unknown";
}

function orderTotalCents(order: OrderRow) {
  const totalCents = Number(order.total_cents);
  if (Number.isFinite(totalCents) && totalCents > 0) return Math.round(totalCents);

  const amount = Number(order.amount);
  if (Number.isFinite(amount) && amount > 0) return Math.round(amount * 100);

  return 0;
}

function orderTokens(order: OrderRow) {
  const tokens = Number(order.tokens ?? order.quantity ?? 0);
  return Number.isFinite(tokens) && tokens > 0 ? Math.trunc(tokens) : 0;
}

function maxDate(...values: Array<string | null | undefined>) {
  let max = 0;
  for (const value of values) {
    if (!value) continue;
    const time = new Date(value).getTime();
    if (Number.isFinite(time) && time > max) max = time;
  }
  return max ? new Date(max).toISOString() : null;
}

async function listAuthUsers(supabaseAdmin: any) {
  const users: Array<{ id: string; email: string | null; created_at: string | null }> = [];
  const perPage = 1000;

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
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

async function listAllRows(
  supabaseAdmin: any,
  table: string,
  select: string,
  options: { orderByCreatedAt?: boolean } = {}
) {
  const pageSize = 1000;
  const all: any[] = [];
  const orderByCreatedAt = options.orderByCreatedAt !== false;

  for (let from = 0; from < 50000; from += pageSize) {
    const to = from + pageSize - 1;
    let query = supabaseAdmin
      .from(table)
      .select(select)
      .range(from, to);

    if (orderByCreatedAt) {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    const batch = data || [];
    all.push(...batch);
    if (batch.length < pageSize) break;
  }

  return all;
}

async function getUsers(supabaseAdmin: any) {
  const [{ data: profiles, error: profilesErr }, authUsers, allOrders, allSites] = await Promise.all([
    supabaseAdmin.from("profiles").select("user_id,name,whatsapp,created_at"),
    listAuthUsers(supabaseAdmin),
    listAllRows(supabaseAdmin, "token_orders", "*"),
    listAllRows(supabaseAdmin, "sites", "id,user_id,company_name,slug,custom_domain,created_at"),
  ]);

  if (profilesErr) throw new Error(profilesErr.message);

  const profileRows =
    (profiles as Array<{
      user_id: string;
      name: string | null;
      whatsapp: string | null;
      created_at: string | null;
    }>) || [];

  const profileByUser = new Map<string, (typeof profileRows)[number]>();
  for (const profile of profileRows) {
    if (profile.user_id) profileByUser.set(profile.user_id, profile);
  }

  const authByUser = new Map<string, (typeof authUsers)[number]>();
  for (const user of authUsers) {
    authByUser.set(user.id, user);
  }

  const userIds = Array.from(
    new Set([
      ...authUsers.map((user) => user.id),
      ...profileRows.map((profile) => profile.user_id).filter(Boolean),
      ...allOrders.map((order) => order.user_id).filter(Boolean),
      ...allSites.map((site) => site.user_id).filter(Boolean),
    ])
  );

  const tokensByUser = new Map<string, number>();
  if (userIds.length) {
    const balances = await listAllRows(supabaseAdmin, "user_token_balances", "user_id,balance", {
      orderByCreatedAt: false,
    });

    for (const row of balances || []) {
      if (row.user_id) tokensByUser.set(row.user_id, Number(row.balance || 0));
    }
  }

  const ordersByUser = new Map<string, OrderRow[]>();
  for (const order of allOrders) {
    if (!order.user_id) continue;
    const list = ordersByUser.get(order.user_id) || [];
    list.push(order);
    ordersByUser.set(order.user_id, list);
  }

  const sitesByUser = new Map<string, SiteRow[]>();
  for (const site of allSites as SiteRow[]) {
    if (!site.user_id) continue;
    const list = sitesByUser.get(site.user_id) || [];
    list.push(site);
    sitesByUser.set(site.user_id, list);
  }

  const users = userIds
    .map((userId) => {
      const profile = profileByUser.get(userId);
      const auth = authByUser.get(userId);
      const orders = ordersByUser.get(userId) || [];
      const sites = sitesByUser.get(userId) || [];
      const paidOrders = orders.filter((order) => normalizeOrderStatus(order) === "paid");
      const pendingOrders = orders.filter((order) => normalizeOrderStatus(order) === "pending");
      const purchasedTokens = paidOrders.reduce((sum, order) => sum + orderTokens(order), 0);
      const spentCents = paidOrders.reduce((sum, order) => sum + orderTotalCents(order), 0);
      const tokenBalance = tokensByUser.get(userId) || 0;
      const sitesCount = sites.length;
      const balanceGap = tokenBalance + sitesCount - purchasedTokens;
      const lastOrderAt = maxDate(...orders.map((order) => order.created_at));
      const lastSiteAt = maxDate(...sites.map((site) => site.created_at));

      return {
        user_id: userId,
        created_at: profile?.created_at || auth?.created_at || null,
        name: profile?.name || null,
        email: auth?.email || null,
        whatsapp: profile?.whatsapp || null,
        token_balance: tokenBalance,
        total_spent_cents: spentCents,
        total_spent_label: money(spentCents),
        purchased_tokens: purchasedTokens,
        paid_orders_count: paidOrders.length,
        pending_orders_count: pendingOrders.length,
        sites_count: sitesCount,
        balance_gap: balanceGap,
        last_order_at: lastOrderAt,
        last_site_at: lastSiteAt,
        last_activity_at: maxDate(lastOrderAt, lastSiteAt, profile?.created_at, auth?.created_at),
        recent_orders: orders.slice(0, 8).map((order) => ({
          id: order.id,
          created_at: order.created_at || null,
          status: normalizeOrderStatus(order),
          tokens: orderTokens(order),
          total_cents: orderTotalCents(order),
          total_label: money(orderTotalCents(order)),
          mp_payment_id: order.mp_payment_id || null,
        })),
        recent_sites: sites.slice(0, 8).map((site) => ({
          id: site.id,
          created_at: site.created_at,
          company_name: site.company_name,
          domain: site.custom_domain || (site.slug ? `${site.slug}.plpainel.com` : null),
        })),
      };
    })
    .sort((a, b) => {
      const tokenDiff = Number(b.token_balance || 0) - Number(a.token_balance || 0);
      if (tokenDiff !== 0) return tokenDiff;
      return new Date(b.last_activity_at || 0).getTime() - new Date(a.last_activity_at || 0).getTime();
    });

  const summary = users.reduce(
    (acc, user) => {
      acc.total_users += 1;
      acc.total_balance += Number(user.token_balance || 0);
      acc.total_purchased_tokens += Number(user.purchased_tokens || 0);
      acc.total_spent_cents += Number(user.total_spent_cents || 0);
      acc.total_sites += Number(user.sites_count || 0);
      acc.paid_orders += Number(user.paid_orders_count || 0);
      acc.pending_orders += Number(user.pending_orders_count || 0);
      if (Number(user.token_balance || 0) <= 0) acc.zero_balance += 1;
      if (Number(user.token_balance || 0) > 0 && Number(user.token_balance || 0) < 10) acc.low_balance += 1;
      if (Number(user.token_balance || 0) >= 10) acc.healthy_balance += 1;
      return acc;
    },
    {
      total_users: 0,
      total_balance: 0,
      total_purchased_tokens: 0,
      total_spent_cents: 0,
      total_spent_label: money(0),
      total_sites: 0,
      paid_orders: 0,
      pending_orders: 0,
      zero_balance: 0,
      low_balance: 0,
      healthy_balance: 0,
    }
  );

  summary.total_spent_label = money(summary.total_spent_cents);

  return { users, summary };
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

    const data = await getUsers(supabaseAdmin);
    return NextResponse.json({ ok: true, ...data });
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

    if (!Number.isFinite(amount) || amount < 0 || amount > 100000) {
      return NextResponse.json({ ok: false, error: "Informe uma quantidade valida." }, { status: 400 });
    }

    if ((mode === "add" || mode === "remove") && amount === 0) {
      return NextResponse.json({ ok: false, error: "Informe uma quantidade maior que zero." }, { status: 400 });
    }

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (!authUser?.user) {
      return NextResponse.json({ ok: false, error: "Usuario nao encontrado no Auth." }, { status: 404 });
    }

    const { data: currentRow, error: currentErr } = await supabaseAdmin
      .from("user_token_balances")
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
      .from("user_token_balances")
      .upsert({ user_id: userId, balance: nextBalance }, { onConflict: "user_id" });

    if (upsertErr) {
      return NextResponse.json({ ok: false, error: upsertErr.message }, { status: 400 });
    }

    await supabaseAdmin
      .from("user_tokens")
      .upsert({ user_id: userId, balance: nextBalance }, { onConflict: "user_id" });

    const data = await getUsers(supabaseAdmin);
    return NextResponse.json({
      ok: true,
      user_id: userId,
      previous_balance: currentBalance,
      balance: nextBalance,
      ...data,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erro interno." }, { status: 500 });
  }
}
