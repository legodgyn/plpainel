import { NextRequest, NextResponse } from "next/server";

const ROOT_DOMAINS = [
  "plpainel.com",
  "acmpainel.com.br",
  "ehspainel.com.br",
  "lcppainel.com.br",
  "lcspainel.com.br",
  "mapspainel.com.br",
];

function cleanHost(host: string) {
  return String(host || "").split(":")[0].toLowerCase().trim();
}

function getRootDomain(host: string) {
  const h = cleanHost(host);

  for (const root of ROOT_DOMAINS) {
    if (h === root || h === `www.${root}` || h.endsWith(`.${root}`)) {
      return root;
    }
  }

  return null;
}

function getSlugFromSubdomain(host: string, root: string) {
  const h = cleanHost(host);

  if (h === root || h === `www.${root}`) return null;

  const suffix = `.${root}`;
  if (!h.endsWith(suffix)) return null;

  return h.slice(0, -suffix.length);
}

export function middleware(req: NextRequest) {
  const host = cleanHost(req.headers.get("host") || "");
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const rootDomain = getRootDomain(host);

  // domínio principal do painel
  if (rootDomain && (host === rootDomain || host === `www.${rootDomain}`)) {
    return NextResponse.next();
  }

  // subdomínio antigo: cliente.ehspainel.com.br -> /s/cliente
  if (rootDomain) {
    const slug = getSlugFromSubdomain(host, rootDomain);

    if (slug && !pathname.startsWith("/s/")) {
      const url = req.nextUrl.clone();
      url.pathname = `/s/${slug}`;
      return NextResponse.rewrite(url);
    }

    return NextResponse.next();
  }

  // domínio próprio comprado: dominio.com.br -> /d/dominio.com.br
  if (!pathname.startsWith("/d/")) {
    const url = req.nextUrl.clone();
    url.pathname = `/d/${host}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
