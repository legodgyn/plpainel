import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const DEFAULT_ROOT_DOMAIN = "plpainel.com";

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

function cleanSlug(value: unknown) {
  return String(value || "").trim().toLowerCase();
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

    const { error: updateError } = await supabaseAdmin
      .from("sites")
      .update({
        base_domain: DEFAULT_ROOT_DOMAIN,
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
      publicUrl: `https://${site.slug}.${DEFAULT_ROOT_DOMAIN}`,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Erro ao normalizar site." },
      { status: 500 }
    );
  }
}
