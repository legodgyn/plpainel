
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import Image from "next/image";

function onlyDigits(v: string) {
  return String(v || "").replace(/\D/g, "");
}

function formatBRPhone(input: string) {
  const digitsRaw = onlyDigits(input);
  if (!digitsRaw) return "";

  let digits = digitsRaw;
  if (digits.length > 11) digits = digits.slice(-11);

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);

  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${ddd}) ${rest}`;

  if (digits.length === 10) {
    const p1 = rest.slice(0, 4);
    const p2 = rest.slice(4, 8);
    return `(${ddd}) ${p1}-${p2}`;
  }

  const r = digits.slice(2, 11);
  const p1 = r.slice(0, 5);
  const p2 = r.slice(5, 9);
  return `(${ddd}) ${p1}-${p2}`;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim().toLowerCase());
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingLogin, setLoadingLogin] = useState(false);

  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<"error" | "success">("error");

  const canSubmitLogin = useMemo(() => {
    return email.trim().length > 3 && password.trim().length >= 6 && !loadingLogin;
  }, [email, password, loadingLogin]);

  async function handleLogin(e?: React.FormEvent) {
    e?.preventDefault();

    setMsg(null);

    const e1 = email.trim().toLowerCase();
    const p1 = password;

    if (!isValidEmail(e1)) {
      setMsg("Digite um e-mail válido.");
      return;
    }

    if (p1.length < 6) {
      setMsg("Digite sua senha.");
      return;
    }

    setLoadingLogin(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: e1,
        password: p1,
      });

      if (error || !data.session) {
        setMsg(error?.message || "Não foi possível entrar.");
        return;
      }

      router.push("/dashboard");

    } catch (err: any) {
      setMsg(err?.message || "Erro ao entrar.");
    } finally {
      setLoadingLogin(false);
    }
  }

  const msgBoxClass =
    msgType === "success"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
      : "border-red-500/20 bg-red-500/10 text-red-200";

  return (
    <main className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[860px] -translate-x-1/2 rounded-full bg-violet-700/20 blur-3xl" />
        <div className="absolute top-40 right-[-120px] h-[360px] w-[360px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute top-56 left-[-140px] h-[360px] w-[360px] rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md px-4">

        <div className="rounded-3xl border border-white/10 bg-white/5 p-7 shadow-[0_24px_80px_rgba(0,0,0,.45)] backdrop-blur">

          <div className="flex items-center gap-3 mb-4">

            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/10 p-1">
              <Image
                src="/favicon.png"
                alt="Logo"
                width={48}
                height={48}
                className="object-contain"
              />
            </div>

            <div>
              <div className="text-xl font-bold">Login</div>
              <div className="text-sm text-white/60">
                Entre com sua conta para acessar o painel.
              </div>
            </div>

          </div>

          {msg && (
            <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${msgBoxClass}`}>
              {msg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">

            <div>
              <label className="text-xs text-white/70">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-violet-400"
              />
            </div>

            <div>
              <label className="text-xs text-white/70">Senha</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="••••••••"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-violet-400"
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmitLogin}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.5 text-sm font-bold hover:opacity-90 disabled:opacity-60 transition"
            >
              {loadingLogin ? "Entrando..." : "Entrar"}
            </button>

            <div className="flex items-center justify-between pt-1">

              <button
                type="button"
                className="text-sm font-semibold text-emerald-300 hover:text-emerald-200"
              >
                CRIAR CONTA
              </button>

              <div className="text-xs text-white/50">
                Use um e-mail válido 😉
              </div>

            </div>

          </form>

        </div>

        <div className="mt-6 text-center text-xs text-white/40">
          © {new Date().getFullYear()} PL - Painel
        </div>

      </div>

    </main>
  );
}
