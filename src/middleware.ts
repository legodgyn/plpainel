import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: ["/((?!_next/|favicon.ico|robots.txt|sitemap.xml).*)"],
};

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const hostname = host.split(":")[0];

  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "plpainel.com";

  // ✅ deixa vercel.app em paz (preview/production default)
  if (hostname.endsWith(".vercel.app")) {
    return NextResponse.next();
  }

  // ✅ domínio raiz e www
  if (hostname === baseDomain || hostname === `www.${baseDomain}`) {
    return NextResponse.next();
  }

  // ✅ painel
  if (hostname === `app.${baseDomain}`) {
    return NextResponse.next();
  }

  // ✅ wildcard: slug.plpainel.com -> /_sites/[slug]
  if (hostname.endsWith(`.${baseDomain}`)) {
    const slug = hostname.slice(0, -(`.${baseDomain}`.length));
    if (!slug) return NextResponse.next();

    const url = req.nextUrl.clone();
    url.pathname = `/_sites/${slug}${req.nextUrl.pathname === "/" ? "" : req.nextUrl.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}
