import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = req.headers.get("host") || "";

  // Ajuste: em DEV, o host geralmente vem como "localhost:3000"
  // Em PROD vem tipo "slug.plpainel.com"
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "plpainel.com";
  const appSubdomain = process.env.NEXT_PUBLIC_APP_SUBDOMAIN || "app";

  // Se estiver em localhost, não tenta subdomínio (a não ser que você configure hosts local)
  if (host.includes("localhost")) {
    return NextResponse.next();
  }

  // Remove porta se existir
  const hostname = host.split(":")[0];

  // Se for o domínio raiz (plpainel.com), deixa normal (depois a gente cria uma landing)
  if (hostname === baseDomain) {
    return NextResponse.next();
  }

  // Se for app.plpainel.com → painel normal
  if (hostname === `${appSubdomain}.${baseDomain}`) {
    return NextResponse.next();
  }

  // Se terminar com .plpainel.com, extrai o slug
  if (hostname.endsWith(`.${baseDomain}`)) {
    const slug = hostname.replace(`.${baseDomain}`, "");

    // Segurança: evita slug vazio
    if (!slug) return NextResponse.next();

    // Reescreve para uma rota interna
    url.pathname = `/_sites/${slug}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}
