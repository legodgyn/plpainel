import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { ok: false, error: "Recurso de email desativado." },
    { status: 410 }
  );
}
