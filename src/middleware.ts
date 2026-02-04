import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: ["/((?!_next|favicon.ico|robots.txt|sitemap.xml).*)"],
};

export function middleware(req: NextRequest) {
  const host = req.headers.get("host");
  if (!host) return NextResponse.next();

  const baseDomain =
    process.env.NEXT_PUBLIC_BASE_DOMAIN || "plpainel.com";

  // remove porta se existir (ex: localhost:3000)
  const hostname = host.split(":")[0].toLowerCase();

  const pathname = req.nextUrl.pathname;

  // ============================
  // 1. Domínio raiz e www → normal
  // ============================
  if (
    hostname === baseDomain ||
    hostname === `www.${baseDomain}` ||
    hostname === `${baseDomain}.` ||
    hostname === `www.${baseDomain}.`
  ) {
    return NextResponse.next();
  }

  // ============================
  // 2. Painel app.plpainel.com
  // ============================
  if (hostname === `app.${baseDomain}`) {
    return NextResponse.next();
  }

  // ============================
  // 3. Wildcard *.plpainel.com
  // ============================
  if (hostname.endsWith(`.${baseDomain}`)) {
    const slug = hostname.replace(`.${baseDomain}`, "");

    // segurança extra
    if (!slug || slug === "www" || slug === "app") {
      return NextResponse.next();
    }

    const url = req.nextUrl.clone();
    url.pathname = `/_sites/${slug}${pathname === "/" ? "" : pathname}`;

    return NextResponse.rewrite(url);
  }

  // ============================
  // 4. Fallback
  // ============================
  return NextResponse.next();
}
