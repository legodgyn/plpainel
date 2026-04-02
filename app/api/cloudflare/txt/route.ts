import { NextResponse } from "next/server";
import { createTxtRecord } from "@/lib/cloudflare";

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

    // pega slug (subdomínio)
    const slug = domain.split(".")[0];

    await createTxtRecord({
      zoneId: process.env.CLOUDFLARE_ZONE_ID!,
      name: slug,
      content: txt,
    });

    return NextResponse.json({
      success: true,
      message: "Registro TXT criado com sucesso",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}