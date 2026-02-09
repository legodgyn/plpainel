// middleware.ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const url = req.nextUrl;

  // Ignora domínio principal
  if (
    host === "plpainel.com" ||
    host === "www.plpainel.com" ||
    host.startsWith("localhost")
  ) {
    return NextResponse.next();
  }

  // Pega o subdomínio
  const parts = host.split(".");
  if (parts.length < 3) {
    return NextResponse.next();
  }

  const subdomain = parts[0];

  // Evita loops
  if (url.pathname.startsWith("/s/")) {
    return NextResponse.next();
  }

  // Rewrite: subdomínio -> /s/slug
  url.pathname = `/s/${subdomain}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"],
};
