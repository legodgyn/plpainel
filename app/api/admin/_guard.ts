import { createClient } from "@supabase/supabase-js";

function getAdminEmails() {
  const raw = process.env.NEXT_PUBLIC_ADMIN_MASTER_EMAILS || "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function isAdminEmail(email?: string | null) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return false;
  return getAdminEmails().includes(e);
}

// ✅ Usa Service Role (somente no server) para ler dados sem depender de RLS
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ✅ Lê o usuário logado via token do cookie (sb-access-token / sb-refresh-token)
async function getUserFromRequest(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const access = cookie.match(/sb-access-token=([^;]+)/)?.[1];
  const refresh = cookie.match(/sb-refresh-token=([^;]+)/)?.[1];

  if (!access || !refresh) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supa = createClient(url, anon, { auth: { persistSession: false } });

  // seta sessão a partir dos cookies
  const { data: setData } = await supa.auth.setSession({
    access_token: decodeURIComponent(access),
    refresh_token: decodeURIComponent(refresh),
  });

  return setData?.user ?? null;
}

export async function assertAdmin(req: Request): Promise<
  | { ok: true; userEmail: string; adminEmails: string[]; service: ReturnType<typeof getServiceClient> }
  | { ok: false; status: number; message: string }
> {
  // se não tiver service key, não deixa passar
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, status: 500, message: "Missing SUPABASE_SERVICE_ROLE_KEY" };
  }

  const user = await getUserFromRequest(req);
  if (!user) return { ok: false, status: 401, message: "unauthorized" };

  const email = user.email || "";
  const admins = getAdminEmails();

  if (!isAdminEmail(email)) return { ok: false, status: 401, message: "unauthorized" };

  return { ok: true, userEmail: email, adminEmails: admins, service: getServiceClient() };
}
