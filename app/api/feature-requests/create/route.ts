import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const auth = req.headers.get("authorization") || "";
    const token = auth.replace("Bearer ", "");

    const { data: userData } = await supabase.auth.getUser(token);

    if (!userData?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { title, description } = body;

    await supabase.from("feature_requests").insert({
      user_id: userData.user.id,
      title,
      description,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}