import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { ok: false, error: "Verificacao de email desativada." },
    { status: 410 }
  );
}
