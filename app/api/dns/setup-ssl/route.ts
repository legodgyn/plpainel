import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { resolve4 } from "node:dns/promises";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);
const DEFAULT_CUSTOM_DOMAIN_IP = "187.77.33.45";

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

function cleanDomain(input: unknown) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split(":")[0];
}

function cleanEmail(input: unknown) {
  return String(input || "").trim().toLowerCase();
}

function isValidDomain(domain: string) {
  return /^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/.test(domain);
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sslSetupFailureMessage(stderr: string) {
  const text = stderr.toLowerCase();

  if (text.includes("password") || text.includes("sudo")) {
    return "Nao foi possivel ativar o SSL automaticamente. Nossa equipe precisa ajustar a permissao do servidor.";
  }

  if (
    text.includes("service is down") ||
    text.includes("internal error") ||
    text.includes("maintenance") ||
    text.includes("letsencrypt.status.io")
  ) {
    return "O emissor de certificados esta temporariamente indisponivel. Aguarde alguns minutos e tente novamente.";
  }

  if (text.includes("letsencrypt") || text.includes("certbot")) {
    return "Nao foi possivel emitir o SSL agora. Aguarde alguns minutos e tente novamente.";
  }

  if (text.includes("nginx")) {
    return "Nao foi possivel aplicar a configuracao do servidor agora. Tente novamente em alguns minutos.";
  }

  return "Nao foi possivel ativar o SSL agora. Tente novamente em alguns minutos.";
}

async function checkHttps(domain: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`https://${domain}`, {
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
    });

    return { ok: true, status: res.status };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "HTTPS ainda nao respondeu.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: Request) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json({ ok: false, error: "Nao autorizado." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const domain = cleanDomain(body.domain);
    const email = cleanEmail(body.email);
    const expectedIp = String(process.env.CUSTOM_DOMAIN_A_RECORD_IP || DEFAULT_CUSTOM_DOMAIN_IP).trim();

    if (!isValidDomain(domain)) {
      return NextResponse.json({ ok: false, error: "Dominio invalido." }, { status: 400 });
    }

    if (email && !isValidEmail(email)) {
      return NextResponse.json({ ok: false, error: "Email invalido." }, { status: 400 });
    }

    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: authData, error: authError } = await supabaseUser.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json({ ok: false, error: "Usuario invalido." }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    const { data: site } = await supabaseAdmin
      .from("sites")
      .select("id")
      .eq("user_id", authData.user.id)
      .eq("custom_domain", domain)
      .maybeSingle();

    if (!site?.id) {
      return NextResponse.json(
        { ok: false, error: "Dominio nao encontrado nos seus sites." },
        { status: 403 }
      );
    }

    const records = await resolve4(domain).catch(() => [] as string[]);
    if (!records.includes(expectedIp)) {
      return NextResponse.json({
        ok: false,
        dnsOk: false,
        expectedIp,
        records,
        error: "Registro A ainda nao aponta para o IP esperado.",
      });
    }

    const scriptPath = path.join(process.cwd(), "scripts", "setup-custom-domain-ssl.sh");
    const args = ["-n", "env", `CUSTOM_DOMAIN_A_RECORD_IP=${expectedIp}`, "bash", scriptPath, domain];
    if (email) args.push(email);

    await execFileAsync("sudo", args, {
      timeout: 180000,
      maxBuffer: 1024 * 1024,
    });
    const https = await checkHttps(domain);

    return NextResponse.json({
      ok: true,
      dnsOk: true,
      sslOk: https.ok,
      domain,
      records,
      message: https.ok
        ? "SSL instalado e HTTPS respondendo."
        : "SSL solicitado, mas o HTTPS ainda nao respondeu. Aguarde alguns instantes e tente novamente.",
      https,
    });
  } catch (error) {
    const err = error as Error & { stdout?: string; stderr?: string; code?: string | number };
    const stderr = err.stderr || "";
    console.error("SSL setup failed", {
      code: err.code,
      message: err.message,
      stdout: err.stdout,
      stderr,
    });

    return NextResponse.json(
      {
        ok: false,
        dnsOk: true,
        sslOk: false,
        message: sslSetupFailureMessage(stderr),
      },
      { status: 500 }
    );
  }
}
