import { NextResponse } from "next/server";

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
    const domain = cleanDomain(body?.domain);

    if (!isValidDomain(domain)) {
      return NextResponse.json(
        { ok: false, error: "Dominio invalido." },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(`https://${domain}`, {
        cache: "no-store",
        redirect: "manual",
        signal: controller.signal,
      });

      return NextResponse.json({
        ok: true,
        status: res.status,
        message: "HTTPS respondeu corretamente.",
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao testar HTTPS.";

    return NextResponse.json({
      ok: false,
      error: message,
      message: "HTTPS ainda nao respondeu com certificado valido.",
    });
  }
}
