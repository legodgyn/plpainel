import { resolve4 } from "node:dns/promises";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_CUSTOM_DOMAIN_IP = "187.77.33.45";

function cleanDomain(input: unknown) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split(":")[0];
}

function isValidDomain(domain: string) {
  return /^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/.test(domain);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const domain = cleanDomain(body.domain);
    const expectedIp =
      String(process.env.CUSTOM_DOMAIN_A_RECORD_IP || DEFAULT_CUSTOM_DOMAIN_IP)
        .trim()
        .toLowerCase();

    if (!isValidDomain(domain)) {
      return NextResponse.json(
        { ok: false, error: "Dominio invalido." },
        { status: 400 }
      );
    }

    const records: string[] = await resolve4(domain).catch(() => [] as string[]);
    const matched = records.includes(expectedIp);

    return NextResponse.json({
      ok: matched,
      domain,
      expectedIp,
      records,
      message: matched
        ? "Registro A configurado corretamente."
        : "Registro A ainda nao aponta para o IP esperado.",
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Erro ao verificar DNS.",
      },
      { status: 500 }
    );
  }
}
