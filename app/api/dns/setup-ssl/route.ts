import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkCustomDomainDns, DEFAULT_CUSTOM_DOMAIN_IP } from "@/lib/customDomainDns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);

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

function cleanPort(input: unknown) {
  const value = String(input || "").trim();
  return /^\d+$/.test(value) ? value : "3000";
}

function sslSetupFailureMessage(stderr: string, stdout = "") {
  const text = `${stdout}\n${stderr}`.toLowerCase();

  if (text.includes("password") || text.includes("sudo")) {
    return "Nao foi possivel ativar o SSL automaticamente. Nossa equipe precisa ajustar a permissao do servidor.";
  }

  if (
    text.includes("outra instalacao de ssl") ||
    text.includes("another instance of certbot") ||
    text.includes("lock file")
  ) {
    return "Ja existe uma instalacao de SSL em andamento. Aguarde terminar e tente novamente.";
  }

  if (text.includes("too many certificates") || text.includes("rate limit")) {
    return "O limite de emissao de certificados foi atingido para esse dominio. Aguarde antes de tentar novamente.";
  }

  if (text.includes("caa")) {
    return "O DNS do dominio possui uma regra CAA que bloqueia a emissao pelo Let's Encrypt.";
  }

  if (text.includes("aaaa") || text.includes("ipv6")) {
    return "Remova o registro AAAA/IPv6 do dominio antes de ativar o SSL.";
  }

  if (text.includes("registro a") || text.includes("dns problem") || text.includes("nxdomain")) {
    return "O DNS ainda nao esta pronto para emitir o SSL. Confira se existe apenas o registro A apontando para o IP do painel.";
  }

  if (
    text.includes("unauthorized") ||
    text.includes("invalid response") ||
    text.includes("timeout during connect") ||
    text.includes("connection refused")
  ) {
    return "O Let's Encrypt nao conseguiu acessar o dominio pela porta 80. Confira o DNS, proxy da Cloudflare e firewall do servidor.";
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
    const appPort = cleanPort(
      process.env.CUSTOM_DOMAIN_APP_PORT || process.env.APP_PORT || process.env.PORT || "3000"
    );

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
    const { data: customDomainSite } = await supabaseAdmin
      .from("sites")
      .select("id")
      .eq("user_id", authData.user.id)
      .eq("custom_domain", domain)
      .maybeSingle();

    let ownedSiteId = customDomainSite?.id as string | undefined;

    if (!ownedSiteId) {
      const [subdomainSlug, ...baseParts] = domain.split(".").filter(Boolean);
      const baseDomain = baseParts.join(".");

      if (subdomainSlug && baseDomain) {
        const { data: subdomainSite } = await supabaseAdmin
          .from("sites")
          .select("id")
          .eq("user_id", authData.user.id)
          .eq("slug", subdomainSlug)
          .eq("base_domain", baseDomain)
          .maybeSingle();

        ownedSiteId = subdomainSite?.id as string | undefined;
      }
    }

    if (!ownedSiteId) {
      return NextResponse.json(
        { ok: false, error: "Dominio nao encontrado nos seus sites." },
        { status: 403 }
      );
    }

    const dnsCheck = await checkCustomDomainDns(domain, expectedIp);
    if (!dnsCheck.ok) {
      return NextResponse.json({
        ok: false,
        dnsOk: false,
        expectedIp: dnsCheck.expectedIp,
        records: dnsCheck.records,
        aRecords: dnsCheck.aRecords,
        aaaaRecords: dnsCheck.aaaaRecords,
        error: dnsCheck.message,
        message: dnsCheck.message,
      });
    }

    const scriptPath = path.join(process.cwd(), "scripts", "setup-custom-domain-ssl.sh");
    const args = [
      "-n",
      "env",
      `CUSTOM_DOMAIN_A_RECORD_IP=${expectedIp}`,
      `APP_PORT=${appPort}`,
      "bash",
      scriptPath,
      domain,
    ];
    if (email) args.push(email);

    await execFileAsync("sudo", args, {
      timeout: 300000,
      maxBuffer: 2 * 1024 * 1024,
    });
    const https = await checkHttps(domain);

    return NextResponse.json({
      ok: true,
      dnsOk: true,
      sslOk: https.ok,
      domain,
      records: dnsCheck.records,
      message: https.ok
        ? "SSL instalado e HTTPS respondendo."
        : "SSL solicitado, mas o HTTPS ainda nao respondeu. Aguarde alguns instantes e tente novamente.",
      https,
    });
  } catch (error) {
    const err = error as Error & { stdout?: string; stderr?: string; code?: string | number };
    const stdout = err.stdout || "";
    const stderr = err.stderr || "";
    const combinedOutput = `${stdout}\n${stderr}`.toLowerCase();
    const dnsRelated =
      combinedOutput.includes("registro a") ||
      combinedOutput.includes("aaaa") ||
      combinedOutput.includes("ipv6") ||
      combinedOutput.includes("dns problem") ||
      combinedOutput.includes("nxdomain");
    console.error("SSL setup failed", {
      code: err.code,
      message: err.message,
      stdout,
      stderr,
    });

    return NextResponse.json(
      {
        ok: false,
        dnsOk: !dnsRelated,
        sslOk: false,
        message: sslSetupFailureMessage(stderr, stdout),
      },
      { status: dnsRelated ? 400 : 500 }
    );
  }
}
