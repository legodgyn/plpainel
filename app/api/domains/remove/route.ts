import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

function cleanDomain(input: unknown) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split(":")[0];
}

function isValidDomain(domain: string) {
  return /^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/.test(domain);
}

export async function POST(req: Request) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return NextResponse.json({ ok: false, error: "Nao autorizado." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const domain = cleanDomain(body.domain);

    if (!isValidDomain(domain)) {
      return NextResponse.json({ ok: false, error: "Dominio invalido." }, { status: 400 });
    }

    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const { data: authData, error: authError } = await supabaseUser.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json({ ok: false, error: "Usuario invalido." }, { status: 401 });
    }

    const userId = authData.user.id;
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const [{ data: availableDomain }, { data: customDomainSites }, { data: baseDomainSites }] =
      await Promise.all([
        supabaseAdmin
          .from("available_domains")
          .select("id, domain")
          .eq("assigned_user_id", userId)
          .eq("domain", domain)
          .maybeSingle(),
        supabaseAdmin
          .from("sites")
          .select("id")
          .eq("user_id", userId)
          .eq("custom_domain", domain),
        supabaseAdmin
          .from("sites")
          .select("id")
          .eq("user_id", userId)
          .eq("base_domain", domain),
      ]);

    const affectedSiteIds = new Set<string>();
    for (const site of customDomainSites || []) affectedSiteIds.add(String(site.id));
    for (const site of baseDomainSites || []) affectedSiteIds.add(String(site.id));

    if (!availableDomain && affectedSiteIds.size === 0) {
      return NextResponse.json(
        { ok: false, error: "Dominio nao encontrado na sua conta." },
        { status: 404 }
      );
    }

    if ((customDomainSites || []).length > 0) {
      const { error } = await supabaseAdmin
        .from("sites")
        .update({
          domain_mode: null,
          custom_domain: null,
        })
        .eq("user_id", userId)
        .eq("custom_domain", domain);

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
    }

    if ((baseDomainSites || []).length > 0) {
      const { error } = await supabaseAdmin
        .from("sites")
        .update({
          base_domain: null,
        })
        .eq("user_id", userId)
        .eq("base_domain", domain);

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
    }

    if (availableDomain?.id) {
      const { error } = await supabaseAdmin
        .from("available_domains")
        .update({
          status: "available",
          assigned_user_id: null,
          assigned_at: null,
          assigned_site_id: null,
        })
        .eq("id", availableDomain.id)
        .eq("assigned_user_id", userId);

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      ok: true,
      domain,
      affectedSites: affectedSiteIds.size,
      released: Boolean(availableDomain?.id),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Erro ao remover dominio." },
      { status: 500 }
    );
  }
}
