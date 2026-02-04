import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: ["/((?!_next|favicon.ico|robots.txt|sitemap.xml).*)"],
};

export function middleware(req: NextRequest) {
  const host = req.headers.get("host");
  if (!host) return NextResponse.next();

  const baseDomain =
    process.env.NEXT_PUBLIC_BASE_DOMAIN?.replace(/^https?:\/\//, "") ||
    "plpainel.com";

  // remove porta (ex: localhost:3000)
  const hostname = host.split(":")[0];
  const pathname = req.nextUrl.pathname;

  // ===============================
  // 1. Domínio raiz → normal
  // ===============================
  if (
    hostname === baseDomain ||
    hostname === `www.${baseDomain}`
  ) {
    return NextResponse.next();
  }

  // ===============================
  // 2. Painel → normal
  // ===============================
  if (hostname === `app.${baseDomain}`) {
    return NextResponse.next();
  }

  // ===============================
  // 3. Wildcard → sites dos clientes
  // ===============================
  if (hostname.endsWith(`.${baseDomain}`)) {
    const slug = hostname.replace(`.${baseDomain}`, "");

    // proteção extra
    if (!slug || slug === "app" || slug === "www") {
      return NextResponse.next();
    }

    const url = req.nextUrl.clone();

    // evita loop
    if (!pathname.startsWith("/_sites")) {
      url.pathname = `/_sites/${slug}${pathname === "/" ? "" : pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}
