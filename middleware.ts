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
      const slug = cleanHost.replace(`.${rootDomain}`, "");
      if (slug && slug !== "www") return slug;
    }
  }

  return null;
}

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const { pathname } = req.nextUrl;

  // ignora rotas internas / arquivos / api
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

  // se for domínio principal, segue normal
  if (!slug) {
    return NextResponse.next();
  }

  // evita loop
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
