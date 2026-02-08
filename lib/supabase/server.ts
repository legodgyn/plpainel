// lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

/**
 * Supabase Server Client (App Router)
 * - Next 15/16: cookies() é async => precisa await
 */
export async function supabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          // Next: cookieStore tem getAll(). Em caso de mismatch, cai pra []
          const anyStore = cookieStore as any;
          return typeof anyStore.getAll === "function" ? anyStore.getAll() : [];
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Em alguns contextos (ex: Server Components) não permite set cookie. Ok ignorar.
          }
        },
      },
    }
  );
}