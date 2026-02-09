// middleware.ts
import { NextRequest, NextResponse } from "next/server";

function getSubdomain(host: string) {
  const h = host.split(":")[0].toLowerCase();

  // Ajuste os "bloqueados" aqui (subdomínios que NÃO são tenant)
  const blocked = new Set(["www", "app"]);

  // Se for o domínio raiz
  if (h === "plpainel.com") return null;

  // Se terminar com .plpainel.com pega a primeira parte
  if (h.endsWith(".plpainel.com")) {
    const sub = h.replace(".plpainel.com", "");
    if (!sub || blocked.has(sub)) return null;
    return sub;
  }

  return null;
}

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const sub = getSubdomain(host);

  // Se não for tenant, deixa passar normal
  if (!sub) return NextResponse.next();

  const url = req.nextUrl.clone();

  // evita loop: se já estiver em /s/slug, não reescreve de novo
  if (url.pathname.startsWith(`/s/${sub}`)) {
    return NextResponse.next();
  }

  // Reescreve:
  // /            -> /s/slug
  // /abc         -> /s/slug/abc
  // /privacy     -> /s/slug/privacy
  url.pathname = `/s/${sub}${url.pathname === "/" ? "" : url.pathname}`;

  return NextResponse.rewrite(url);
}

// ignora assets e api
export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
