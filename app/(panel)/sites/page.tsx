import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!jwt) {
      return NextResponse.json({ error: "Sem token de auth" }, { status: 401 });
    }

    const supabase = createClient(
      env("NEXT_PUBLIC_SUPABASE_URL"),
      env("SUPABASE_SERVICE_ROLE_KEY")
    );

    const { data: userRes, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userRes?.user) {
      return NextResponse.json({ error: "Usuário não autenticado" }, { status: 401 });
    }

    const user = userRes.user;

    const { data: sites, error: sitesErr } = await supabase
      .from("sites")
      .select("id, slug, name, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (sitesErr) {
      return NextResponse.json({ error: sitesErr.message }, { status: 500 });
    }

    return NextResponse.json({ sites: sites ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro" }, { status: 500 });
  }
}
