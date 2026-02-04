import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const config = {
  matcher: ["/((?!_next/|favicon.ico|robots.txt|sitemap.xml).*)"],
};

export async function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const hostname = host.split(":")[0];
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "plpainel.com";

  const pathname = req.nextUrl.pathname;

  // ✅ ignora vercel preview domain
  if (hostname.endsWith(".vercel.app")) {
    return NextResponse.next();
  }

  // --- 1) Decide se vai REWRITE para sites (subdomínios) ---
  let response: NextResponse;

  const isRoot = hostname === baseDomain || hostname === `www.${baseDomain}`;
  const isPanel = hostname === `app.${baseDomain}`;

  const isWildcard = hostname.endsWith(`.${baseDomain}`) && !isRoot && !isPanel;

  if (isWildcard) {
    const slug = hostname.slice(0, -(`.${baseDomain}`.length));
    const url = req.nextUrl.clone();
    url.pathname = `/_sites/${slug}${pathname === "/" ? "" : pathname}`;
    response = NextResponse.rewrite(url);
  } else {
    response = NextResponse.next();
  }

  // --- 2) Refresh da sessão Supabase (seta cookies no response) ---
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // importante: isso força o Supabase a atualizar cookies quando necessário
  await supabase.auth.getUser();

  return response;
}
