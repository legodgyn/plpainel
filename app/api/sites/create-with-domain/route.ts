import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

export async function POST(req: Request) {
  try {
    const token = getBearerToken(req);
    const body = await req.json();

    if (!token) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
      }
    );

    const { data: authData } = await supabaseUser.auth.getUser();
    const user = authData.user;

    if (!user) {
      return NextResponse.json({ ok: false, error: "Usuário inválido." }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 🔍 pega domínio disponível do usuário
    const { data: domainRow } = await supabaseAdmin
      .from("available_domains")
      .select("*")
      .eq("id", body.domainId)
      .eq("assigned_user_id", user.id)
      .eq("status", "sold")
      .is("assigned_site_id", null)
      .maybeSingle();

    if (!domainRow) {
      return NextResponse.json({ ok: false, error: "Domínio inválido ou já usado." }, { status: 400 });
    }

    // 🔥 cria site
    const { data: site, error: siteError } = await supabaseAdmin
      .from("sites")
      .insert({
        company_name: body.companyName,
        cnpj: body.cnpj,
        phone: body.phone,
        email: body.email,
        whatsapp: body.whatsapp,
        instagram: body.instagram || null,
        mission: body.mission,
        about: body.about,
        privacy: body.privacy,
        footer: body.footer,

        domain_mode: "custom_domain",
        custom_domain: domainRow.domain,
        slug: null,

        is_public: true,
      })
      .select("*")
      .single();

    if (siteError) {
      return NextResponse.json({ ok: false, error: siteError.message }, { status: 500 });
    }

    // 🔒 marca domínio como usado
    await supabaseAdmin
      .from("available_domains")
      .update({
        status: "used",
        assigned_site_id: site.id,
      })
      .eq("id", domainRow.id);

    return NextResponse.json({
      ok: true,
      siteId: site.id,
      domain: domainRow.domain,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Erro ao criar site." },
      { status: 500 }
    );
  }
}