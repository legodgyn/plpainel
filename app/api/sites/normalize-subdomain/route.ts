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

const DEFAULT_ROOT_DOMAIN = ROOT_DOMAINS[0];

type SiteDomainRow = {
  base_domain: string | null;
  domain_mode: string | null;
};

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

function cleanSlug(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function pickRootDomain(rows: SiteDomainRow[]) {
  const counts = new Map<string, number>();
  for (const root of ROOT_DOMAINS) {
    counts.set(root, 0);
  }

  for (const row of rows) {
    if (row.domain_mode === "custom_domain") {
      continue;
    }

    const baseDomain = String(row.base_domain || "");
    if (counts.has(baseDomain)) {
      counts.set(baseDomain, (counts.get(baseDomain) || 0) + 1);
    }
  }

  return [...ROOT_DOMAINS].sort((a, b) => {
    const diff = (counts.get(a) || 0) - (counts.get(b) || 0);
    return diff || ROOT_DOMAINS.indexOf(a) - ROOT_DOMAINS.indexOf(b);
  })[0] || DEFAULT_ROOT_DOMAIN;
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

    const { data: domainRows } = await supabaseAdmin
      .from("sites")
      .select("base_domain, domain_mode")
      .in("base_domain", [...ROOT_DOMAINS]);

    const baseDomain = pickRootDomain((domainRows || []) as SiteDomainRow[]);

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
