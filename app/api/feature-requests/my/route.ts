import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: userData } = await supabase.auth.getUser(token);

  if (!userData?.user) {
    return NextResponse.json([], { status: 401 });
  }

  const { data } = await supabase
    .from("feature_requests")
    .select("*")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json(data);
}