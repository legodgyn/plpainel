import { NextResponse } from "next/server";
import { upsertTxtRecord } from "@/lib/cloudflare";

export async function POST(req: Request) {
  try {
    const { domain, txt } = await req.json();

    if (!domain || !txt) {
      return NextResponse.json(
        { error: "Domain e TXT são obrigatórios" },
        { status: 400 }
      );
    }

    if (!txt.includes("facebook-domain-verification=")) {
      return NextResponse.json(
        { error: "TXT inválido" },
        { status: 400 }
      );
    }

    await upsertTxtRecord({
      domain,
      content: txt,
    });

    return NextResponse.json({
      success: true,
      message: "TXT criado/atualizado com sucesso",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
