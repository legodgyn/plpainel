import { resolveMx, resolveTxt } from "node:dns/promises";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_MAIL_HOST = "mail.plpainel.com";

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

function normalizeHost(value: string) {
  return String(value || "").trim().toLowerCase().replace(/\.$/, "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const domain = cleanDomain(body.domain);
    const mailHost = normalizeHost(process.env.PANEL_MAIL_MX_HOST || DEFAULT_MAIL_HOST);

    if (!isValidDomain(domain)) {
      return NextResponse.json({ ok: false, error: "Dominio invalido." }, { status: 400 });
    }

    const [mxRecords, txtRecords] = await Promise.all([
      resolveMx(domain).catch(() => [] as Awaited<ReturnType<typeof resolveMx>>),
      resolveTxt(domain).catch(() => [] as Awaited<ReturnType<typeof resolveTxt>>),
    ]);

    const mxHosts = mxRecords.map((record) => normalizeHost(record.exchange));
    const txtValues = txtRecords.map((record) => record.join(""));
    const hasMx = mxHosts.includes(mailHost);
    const hasSpf = txtValues.some((value) => {
      const text = value.toLowerCase();
      return text.includes("v=spf1") && (text.includes(" mx") || text.includes("mx "));
    });
    const ok = hasMx && hasSpf;

    return NextResponse.json({
      ok,
      domain,
      mxRecords,
      txtValues,
      expected: {
        mx: mailHost,
        spf: "v=spf1 mx ~all",
      },
      missing: {
        mx: hasMx ? [] : [mailHost],
        spf: hasSpf ? [] : ["v=spf1 mx ~all"],
      },
      message: ok
        ? "Caixa de entrada configurada corretamente."
        : "DNS de email ainda nao esta completo.",
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Erro ao verificar email.",
      },
      { status: 500 }
    );
  }
}
