import { NextRequest, NextResponse } from "next/server";

function getSubdomain(host: string) {
  // remove porta (ex: localhost:3000)
  const cleanHost = host.split(":")[0];

  // ajuste se você usar www ou app
  if (cleanHost === "plpainel.com") return null;
  if (cleanHost === "www.plpainel.com") return null;
  if (cleanHost === "app.plpainel.com") return null;

  // pega "teste123" de "teste123.plpainel.com"
  const parts = cleanHost.split(".");
  if (parts.length < 3) return null;

  return parts[0];
}

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const sub = getSubdomain(host);

  // Se for subdomínio, reescreve para /s/{slug} mantendo URL bonita
  if (sub) {
    const url = req.nextUrl.clone();

    // não reescreve assets/api
    if (
      url.pathname.startsWith("/_next") ||
      url.pathname.startsWith("/api") ||
      url.pathname === "/favicon.ico"
    ) {
      return NextResponse.next();
    }

    url.pathname = `/s/${sub}${url.pathname === "/" ? "" : url.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"],
};
