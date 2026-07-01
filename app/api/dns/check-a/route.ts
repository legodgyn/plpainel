import { NextResponse } from "next/server";
import { checkCustomDomainDns, DEFAULT_CUSTOM_DOMAIN_IP } from "@/lib/customDomainDns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    return NextResponse.json(await checkCustomDomainDns(domain, expectedIp));
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
