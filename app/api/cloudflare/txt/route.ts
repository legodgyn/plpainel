import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Criacao automatica de TXT desativada temporariamente.",
    },
    { status: 403 }
  );
}
