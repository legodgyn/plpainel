import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

function cleanString(value: unknown) {
  return String(value || "").trim();
}

export async function POST(req: Request) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return NextResponse.json({ ok: false, error: "Sessao expirada. Faca login novamente." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const siteId = cleanString(body.id);

    if (!siteId) {
      return NextResponse.json({ ok: false, error: "Site nao informado." }, { status: 400 });
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
      return NextResponse.json({ ok: false, error: "Sessao expirada. Faca login novamente." }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const payload: Record<string, unknown> = {
      company_name: cleanString(body.company_name),
      cnpj: cleanString(body.cnpj),
      mission: cleanString(body.mission),
      phone: cleanString(body.phone),
      email: cleanString(body.email),
      instagram: cleanString(body.instagram) || null,
      whatsapp: cleanString(body.whatsapp),
      about: cleanString(body.about),
      privacy: cleanString(body.privacy),
      footer: cleanString(body.footer),
      is_public: Boolean(body.is_public),
      meta_verify_name: body.meta_verify_name ? cleanString(body.meta_verify_name) : null,
      meta_verify_content: body.meta_verify_content ? cleanString(body.meta_verify_content) : null,
    };

    if (Object.prototype.hasOwnProperty.call(body, "meta_txt")) {
      payload.meta_txt = body.meta_txt ? cleanString(body.meta_txt) : null;
    }

    const { data, error } = await supabaseAdmin
      .from("sites")
      .update(payload)
      .eq("id", siteId)
      .eq("user_id", authData.user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data?.id) {
      return NextResponse.json(
        { ok: false, error: "Site nao encontrado para este usuario." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, siteId: data.id });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Erro ao salvar site." },
      { status: 500 }
    );
  }
}
