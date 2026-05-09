import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const ROOT_DOMAINS = [
  "plpainel.com",
  "acmpainel.com.br",
  "ehspainel.com.br",
  "lcppainel.com.br",
  "lcspainel.com.br",
  "mapspainel.com.br",
] as const;

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

function cleanSlug(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function cleanDomain(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split(":")[0];
}

function isValidDomain(value: string) {
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(value);
}

function pickRootDomain(seed: string) {
  const input = seed || String(Date.now());
  let hash = 0;

  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }

  return ROOT_DOMAINS[hash % ROOT_DOMAINS.length];
}

export async function POST(req: Request) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return NextResponse.json({ ok: false, error: "Nao autorizado." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const slug = cleanSlug(body.slug);
    const siteId = String(body.siteId || "").trim();
    const requestedBaseDomain = cleanDomain(body.baseDomain);

    if (!slug && !siteId) {
      return NextResponse.json(
        { ok: false, error: "Site nao informado." },
        { status: 400 }
      );
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

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    let query = supabaseAdmin
      .from("sites")
      .select("id, slug")
      .eq("user_id", authData.user.id);

    if (siteId) {
      query = query.eq("id", siteId);
    } else {
      query = query.eq("slug", slug).order("created_at", { ascending: false }).limit(1);
    }

    const { data: site, error: findError } = await query.maybeSingle();

    if (findError || !site) {
      return NextResponse.json(
        { ok: false, error: findError?.message || "Site criado, mas nao localizado." },
        { status: 404 }
      );
    }

    let baseDomain: string = pickRootDomain(`${site.id}:${site.slug}`);

    if (requestedBaseDomain) {
      if (!isValidDomain(requestedBaseDomain)) {
        return NextResponse.json(
          { ok: false, error: "Dominio selecionado invalido." },
          { status: 400 }
        );
      }

      const { data: availableDomain } = await supabaseAdmin
        .from("available_domains")
        .select("id, domain")
        .eq("assigned_user_id", authData.user.id)
        .eq("domain", requestedBaseDomain)
        .maybeSingle();

      const { data: connectedDomainSite } = availableDomain
        ? { data: null }
        : await supabaseAdmin
            .from("sites")
            .select("id, custom_domain")
            .eq("user_id", authData.user.id)
            .eq("domain_mode", "custom_domain")
            .eq("custom_domain", requestedBaseDomain)
            .maybeSingle();

      const ownedDomain =
        (availableDomain?.domain as string | undefined) ||
        (connectedDomainSite?.custom_domain as string | undefined);

      if (!ownedDomain) {
        return NextResponse.json(
          { ok: false, error: "Dominio nao pertence ao usuario logado." },
          { status: 403 }
        );
      }

      baseDomain = ownedDomain;
    }

    const { data: existingSite, error: existingError } = await supabaseAdmin
      .from("sites")
      .select("id")
      .eq("slug", site.slug)
      .eq("base_domain", baseDomain)
      .neq("id", site.id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ ok: false, error: existingError.message }, { status: 500 });
    }

    if (existingSite?.id) {
      return NextResponse.json(
        { ok: false, error: "Ja existe um site com esse subdominio neste dominio." },
        { status: 409 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("sites")
      .update({
        base_domain: baseDomain,
        domain_mode: null,
        custom_domain: null,
      })
      .eq("id", site.id)
      .eq("user_id", authData.user.id);

    if (updateError) {
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      siteId: site.id,
      baseDomain,
      publicUrl: `https://${site.slug}.${baseDomain}`,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Erro ao normalizar site." },
      { status: 500 }
    );
  }
}
