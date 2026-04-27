import { NextRequest, NextResponse } from "next/server";

const ROOT_DOMAINS = [
  "plpainel.com",
  "acmpainel.com.br",
  "ehspainel.com.br",
  "lcppainel.com.br",
  "lcspainel.com.br",
  "mapspainel.com.br",
];

function getCleanHost(host: string) {
  return String(host || "").split(":")[0].trim().toLowerCase();
}

function getBaseDomainFromHost(host: string) {
  const cleanHost = getCleanHost(host);

  for (const rootDomain of ROOT_DOMAINS) {
    if (cleanHost === rootDomain || cleanHost === `www.${rootDomain}`) {
      return rootDomain;
    }

    if (cleanHost.endsWith(`.${rootDomain}`)) {
      return rootDomain;
    }
  }

  return null;
}

function extractSlugFromHost(host: string, baseDomain: string | null) {
  if (!baseDomain) return null;

  const cleanHost = getCleanHost(host);

  if (cleanHost === baseDomain || cleanHost === `www.${baseDomain}`) {
    return null;
  }

  if (!cleanHost.endsWith(`.${baseDomain}`)) {
    return null;
  }

  const withoutBase = cleanHost.slice(0, -(`.${baseDomain}`.length));
  if (!withoutBase) return null;

  const parts = withoutBase.split(".").filter(Boolean);
  if (parts.length === 0) return null;

  return parts[parts.length - 1] || null;
}

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const baseDomain = getBaseDomainFromHost(host);
  const slug = extractSlugFromHost(host, baseDomain);

  const { pathname, search } = req.nextUrl;

  // deixa assets e rotas do sistema passarem
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/billing") ||
    pathname.startsWith("/sites") ||
    pathname.startsWith("/tokens") ||
    pathname.startsWith("/affiliate") ||
    pathname.startsWith("/tutorial") ||
    pathname.startsWith("/sugestoes") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // se não é subdomínio válido, segue normal
  if (!baseDomain || !slug) {
    return NextResponse.next();
  }

  // se já está na rota interna /s/[slug], não reescreve de novo
  if (pathname.startsWith("/s/")) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = `/s/${slug}`;
  url.search = search;

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/:path*"],
};
