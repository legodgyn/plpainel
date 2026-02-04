import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: ["/:path*"],
};

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "plpainel.com";

  // remove porta
  const hostname = host.split(":")[0];
  const pathname = req.nextUrl.pathname;

  // ignora next assets e arquivos
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return NextResponse.next();
  }

  // ✅ ignora rotas de sistema/auth/API (isso evita quebrar login/session)
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth") ||
    pathname === "/login" ||
    pathname === "/register"
  ) {
    return NextResponse.next();
  }

  // domínio raiz e www ficam normais
  if (hostname === baseDomain || hostname === `www.${baseDomain}`) {
    return NextResponse.next();
  }

  // painel fica normal
  if (hostname === `app.${baseDomain}`) {
    return NextResponse.next();
  }

  // wildcard: extrai subdomínio e reescreve pra rota interna PRESERVANDO PATH
  if (hostname.endsWith(`.${baseDomain}`)) {
    const slug = hostname.slice(0, -(`.${baseDomain}`.length));
    if (!slug) return NextResponse.next();

    const url = req.nextUrl.clone();
    // ✅ preserva o caminho original
    url.pathname = `/_sites/${slug}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}
