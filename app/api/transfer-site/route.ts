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
  const master = (process.env.ADMIN_MASTER_EMAIL || "").toLowerCase();

  if (!master || email !== master) {
    return { ok: false, status: 403, message: "Acesso negado." };
  }

  return { ok: true, user: data.user };
}

export async function POST(req: Request) {
  const { site_ids, target_user_id } = await req.json();

  if (!site_ids?.length || !target_user_id) {
    return NextResponse.json({ ok: false, error: "Dados inválidos" });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabaseAdmin
    .from("sites")
    .update({ user_id: target_user_id })
    .in("id", site_ids);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message });
  }

  return NextResponse.json({ ok: true });
}

    const body = await req.json().catch(() => ({} as any));

    const siteIds = Array.isArray(body?.site_ids)
      ? body.site_ids.map((x: any) => String(x)).filter(Boolean)
      : [];

    const fromUserId = String(body?.from_user_id || "").trim();
    const toUserId = String(body?.to_user_id || "").trim();

    if (!siteIds.length) {
      return NextResponse.json(
        { ok: false, error: "Selecione pelo menos 1 site." },
        { status: 400 }
      );
    }

    if (!fromUserId || !toUserId) {
      return NextResponse.json(
        { ok: false, error: "Usuário de origem e destino são obrigatórios." },
        { status: 400 }
      );
    }

    if (fromUserId === toUserId) {
      return NextResponse.json(
        { ok: false, error: "Origem e destino não podem ser iguais." },
        { status: 400 }
      );
    }

    const { data: sites, error: sitesErr } = await supabaseAdmin
      .from("sites")
      .select("id,user_id,slug,company_name")
      .in("id", siteIds)
      .eq("user_id", fromUserId);

    if (sitesErr) {
      return NextResponse.json(
        { ok: false, error: sitesErr.message },
        { status: 400 }
      );
    }

    if (!sites || sites.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Nenhum site válido encontrado para transferência." },
        { status: 404 }
      );
    }

    const validSiteIds = sites.map((s: any) => s.id);

    const { error: updateErr } = await supabaseAdmin
      .from("sites")
      .update({ user_id: toUserId })
      .in("id", validSiteIds)
      .eq("user_id", fromUserId);

    if (updateErr) {
      return NextResponse.json(
        { ok: false, error: updateErr.message },
        { status: 400 }
      );
    }

    await supabaseAdmin.from("admin_audit_logs").insert(
      sites.map((site: any) => ({
        admin_user_id: guard.user.id,
        action: "transfer_site",
        entity_type: "site",
        entity_id: site.id,
        from_user_id: fromUserId,
        to_user_id: toUserId,
        payload: {
          slug: site.slug,
          company_name: site.company_name,
        },
      }))
    );

    return NextResponse.json({
      ok: true,
      transferred: validSiteIds.length,
      site_ids: validSiteIds,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro interno." },
      { status: 500 }
    );
  }
}
