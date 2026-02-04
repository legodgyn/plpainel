import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: ["/:path*"],
};

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "plpainel.com";

  // remove porta
  const hostname = host.split(":")[0];

  // ignora next assets e arquivos
  const pathname = req.nextUrl.pathname;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml")
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

  // wildcard: extrai subdomínio e reescreve pra rota interna
  if (hostname.endsWith(`.${baseDomain}`)) {
    const slug = hostname.replace(`.${baseDomain}`, "");
    if (!slug) return NextResponse.next();

    const url = req.nextUrl.clone();
    url.pathname = `/_sites/{slug}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}
