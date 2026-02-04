import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function supabaseServer() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // Compatível com diferentes versões do Next
          const c: any = cookieStore as any;

          // Caso 1: cookieStore.get(name) -> { value }
          if (typeof c.get === "function") {
            return c.get(name)?.value;
          }

          // Caso 2: cookieStore() retorna objeto simples { [name]: value }
          if (typeof c === "object" && c[name]) {
            return c[name];
          }

          return undefined;
        },

        set(name: string, value: string, options: any) {
          const c: any = cookieStore as any;

          if (typeof c.set === "function") {
            c.set({ name, value, ...options });
          }
        },

        remove(name: string, options: any) {
          const c: any = cookieStore as any;

          if (typeof c.set === "function") {
            c.set({ name, value: "", ...options });
          }
        },
      },
    }
  );
}
