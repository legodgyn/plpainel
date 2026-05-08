import { resolveMx, resolveTxt } from "node:dns/promises";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLOUDFLARE_MX = [
  "route1.mx.cloudflare.net",
  "route2.mx.cloudflare.net",
  "route3.mx.cloudflare.net",
];

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

function normalizeExchange(exchange: string) {
  return String(exchange || "").trim().toLowerCase().replace(/\.$/, "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const domain = cleanDomain(body.domain);

    if (!isValidDomain(domain)) {
      return NextResponse.json(
        { ok: false, error: "Dominio invalido." },
        { status: 400 }
      );
    }

    const [mxRecords, txtRecords] = await Promise.all([
      resolveMx(domain).catch(() => [] as Awaited<ReturnType<typeof resolveMx>>),
      resolveTxt(domain).catch(() => [] as Awaited<ReturnType<typeof resolveTxt>>),
    ]);

    const mxHosts = mxRecords.map((record) => normalizeExchange(record.exchange));
    const missingMx = CLOUDFLARE_MX.filter((host) => !mxHosts.includes(host));
    const txtValues = txtRecords.map((record) => record.join(""));
    const hasCloudflareSpf = txtValues.some((value) =>
      value.toLowerCase().includes("include:_spf.mx.cloudflare.net")
    );

    const ok = missingMx.length === 0 && hasCloudflareSpf;

    return NextResponse.json({
      ok,
      domain,
      mxRecords,
      txtValues,
      missingMx,
      hasCloudflareSpf,
      expected: {
        mx: CLOUDFLARE_MX,
        spf: "v=spf1 include:_spf.mx.cloudflare.net ~all",
      },
      message: ok
        ? "Cloudflare Email Routing configurado corretamente."
        : "Email Routing ainda nao esta completo no DNS.",
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Erro ao verificar e-mail.",
      },
      { status: 500 }
    );
  }
}
