import { NextRequest, NextResponse } from "next/server";

const ROOT_DOMAINS = [
  "plpainel.com",
  "acmpainel.com.br",
  "ehspainel.com.br",
  "lcppainel.com.br",
  "lcspainel.com.br",
  "mapspainel.com.br",
];

function getSlugFromHost(host: string) {
  const cleanHost = host.split(":")[0].toLowerCase();

  for (const rootDomain of ROOT_DOMAINS) {
    if (cleanHost === rootDomain) return null;
    if (cleanHost === `www.${rootDomain}`) return null;

    if (cleanHost.endsWith(`.${rootDomain}`)) {
      const slug = cleanHost.slice(0, -(rootDomain.length + 1));
      if (slug && slug !== "www") return slug;
    }
  }

  return null;
}

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
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

  const slug = getSlugFromHost(host);

  if (!slug) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/s/")) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = `/s/${slug}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
