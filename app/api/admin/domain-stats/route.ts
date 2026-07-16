import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type SiteRow = {
  id: string;
  slug: string | null;
  company_name: string | null;
  created_at: string | null;
  is_public: boolean | null;
  base_domain: string | null;
  domain_mode: string | null;
  custom_domain: string | null;
};

type DomainStat = {
  domain: string;
  kind: "platform" | "custom";
  total: number;
  active: number;
  hidden: number;
  last_created_at: string | null;
  last_site: {
    id: string;
    slug: string | null;
    company_name: string | null;
    url: string;
  } | null;
};

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function normalizeDomain(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

function getAdminEmails() {
  const emails = [
    process.env.ADMIN_MASTER_EMAIL,
    process.env.NEXT_PUBLIC_ADMIN_MASTER_EMAIL,
    ...(process.env.NEXT_PUBLIC_ADMIN_MASTER_EMAILS || "").split(","),
  ];

  return Array.from(
    new Set(emails.map((email) => String(email || "").trim().toLowerCase()).filter(Boolean))
  );
}

async function assertAdmin(req: Request, supabaseAdmin: any) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return { ok: false as const, status: 401, message: "Nao autorizado." };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return { ok: false as const, status: 401, message: "Nao autorizado." };
  }

  const email = String(data.user.email || "").toLowerCase();
  const adminEmails = getAdminEmails();

  if (!adminEmails.length || !adminEmails.includes(email)) {
    return { ok: false as const, status: 403, message: "Acesso negado." };
  }

  return { ok: true as const, user: data.user };
}

function getSiteDomain(site: SiteRow) {
  const customDomain = normalizeDomain(site.custom_domain);
  if (site.domain_mode === "custom_domain" && customDomain) {
    return { domain: customDomain, kind: "custom" as const };
  }

  return {
    domain: normalizeDomain(site.base_domain) || "plpainel.com",
    kind: "platform" as const,
  };
}

function getSiteUrl(site: SiteRow, domain: string, kind: DomainStat["kind"]) {
  if (kind === "custom") return `https://${domain}`;
  return `https://${site.slug || "site"}.${domain}`;
}

async function fetchAllSites(supabaseAdmin: any) {
  const pageSize = 1000;
  const sites: SiteRow[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseAdmin
      .from("sites")
      .select("id, slug, company_name, created_at, is_public, base_domain, domain_mode, custom_domain")
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(error.message);

    const page = (data || []) as SiteRow[];
    sites.push(...page);

    if (page.length < pageSize) break;
  }

  return sites;
}

export async function GET(req: Request) {
  try {
    const supabaseAdmin = createClient(
      env("NEXT_PUBLIC_SUPABASE_URL"),
      env("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } }
    );

    const guard = await assertAdmin(req, supabaseAdmin);
    if (!guard.ok) {
      return NextResponse.json({ ok: false, error: guard.message }, { status: guard.status });
    }

    const sites = await fetchAllSites(supabaseAdmin);
    const statsByDomain = new Map<string, DomainStat>();

    for (const site of sites) {
      const { domain, kind } = getSiteDomain(site);
      const key = `${kind}:${domain}`;
      const isPublic = site.is_public !== false;

      const current =
        statsByDomain.get(key) ||
        ({
          domain,
          kind,
          total: 0,
          active: 0,
          hidden: 0,
          last_created_at: null,
          last_site: null,
        } satisfies DomainStat);

      current.total += 1;
      if (isPublic) current.active += 1;
      else current.hidden += 1;

      const createdAt = site.created_at;
      const isNewer =
        createdAt &&
        (!current.last_created_at ||
          new Date(createdAt).getTime() > new Date(current.last_created_at).getTime());

      if (isNewer) {
        current.last_created_at = createdAt;
        current.last_site = {
          id: site.id,
          slug: site.slug,
          company_name: site.company_name,
          url: getSiteUrl(site, domain, kind),
        };
      }

      statsByDomain.set(key, current);
    }

    const stats = Array.from(statsByDomain.values()).sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.domain.localeCompare(b.domain, "pt-BR", { sensitivity: "base" });
    });

    return NextResponse.json({
      ok: true,
      generated_at: new Date().toISOString(),
      totals: {
        sites: sites.length,
        domains: stats.length,
        platform_sites: stats
          .filter((item) => item.kind === "platform")
          .reduce((sum, item) => sum + item.total, 0),
        custom_sites: stats
          .filter((item) => item.kind === "custom")
          .reduce((sum, item) => sum + item.total, 0),
        active: stats.reduce((sum, item) => sum + item.active, 0),
        hidden: stats.reduce((sum, item) => sum + item.hidden, 0),
      },
      domains: stats,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Erro ao carregar dominios." },
      { status: 500 }
    );
  }
}
