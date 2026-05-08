import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

function onlyDigits(value: unknown) {
  return String(value || "").replace(/\D/g, "");
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

function slugify(input: string) {
  return String(input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function POST(req: Request) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return NextResponse.json({ ok: false, error: "Nao autorizado." }, { status: 401 });
    }

    const body = await req.json();
    const domain = cleanDomain(body.domain);
    const cnpj = onlyDigits(body.cnpj);

    if (!isValidDomain(domain)) {
      return NextResponse.json({ ok: false, error: "Dominio invalido." }, { status: 400 });
    }

    if (cnpj.length !== 14) {
      return NextResponse.json({ ok: false, error: "CNPJ invalido." }, { status: 400 });
    }

    if (!String(body.company_name || "").trim()) {
      return NextResponse.json({ ok: false, error: "Razao social obrigatoria." }, { status: 400 });
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

    const user = authData.user;
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: existing } = await supabaseAdmin
      .from("sites")
      .select("id")
      .eq("custom_domain", domain)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Este dominio ja esta vinculado a um site." },
        { status: 400 }
      );
    }

    const slug = `dominio-${slugify(domain) || Date.now()}`;

    const { error: rpcError } = await supabaseUser.rpc("create_site_with_token", {
      p_slug: slug,
      p_company_name: String(body.company_name || "").trim(),
      p_cnpj: cnpj,
      p_phone: body.phone || null,
      p_email: body.email || null,
      p_instagram: body.instagram || null,
      p_whatsapp: body.whatsapp || null,
      p_mission: body.mission || null,
      p_about: body.about || null,
      p_privacy: body.privacy || null,
      p_footer: body.footer || null,
      p_meta_verify_name: body.meta_verify_name || null,
      p_meta_verify_content: body.meta_verify_content || null,
    });

    if (rpcError) {
      const msg = rpcError.message || "Erro ao criar site.";
      const insufficient =
        msg === "insufficient_tokens" ||
        msg === "not_enough_tokens" ||
        msg.toLowerCase().includes("token");

      return NextResponse.json(
        {
          ok: false,
          error: insufficient
            ? "Voce nao possui tokens suficientes para criar um site."
            : msg,
          code: insufficient ? "insufficient_tokens" : "create_failed",
        },
        { status: insufficient ? 402 : 500 }
      );
    }

    const { data: site, error: siteFetchError } = await supabaseAdmin
      .from("sites")
      .select("id")
      .eq("user_id", user.id)
      .eq("slug", slug)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (siteFetchError || !site?.id) {
      return NextResponse.json(
        { ok: false, error: siteFetchError?.message || "Site criado, mas nao localizado." },
        { status: 500 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("sites")
      .update({
        domain_mode: "custom_domain",
        custom_domain: domain,
        is_public: true,
      })
      .eq("id", site.id);

    if (updateError) {
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      siteId: site.id,
      domain,
      publicUrl: `https://${domain}`,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Erro ao criar site.",
      },
      { status: 500 }
    );
  }
}
