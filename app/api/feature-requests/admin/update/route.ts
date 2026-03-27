import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const body = await req.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { id, status, admin_note } = body;

  await supabase
    .from("feature_requests")
    .update({
      status,
      admin_note,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}