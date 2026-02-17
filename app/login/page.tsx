"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

export const dynamic = "force-dynamic";

function cleanEmail(v: string) {
  return String(v || "").trim().toLowerCase();
}

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();

  const ref = useMemo(() => (search?.get("ref") || "").trim(), [search]);

  const [loading, setLoading] = useState(false);

  // Login form
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  // Register modal
  const [openRegister, setOpenRegister] = useState(false);
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");

  // Messages
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function boot() {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      if (data.session?.user) router.push("/dashboard");
    }

    boot();
    return () => {
      alive = false;
    };
  }, [router]);

  function resetMsgs() {
    setError(null);
    setSuccess(null);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    resetMsgs();

    const eMail = cleanEmail(email);
    if (!eMail) return setError("Informe seu e-mail.");
    if (!pass) return setError("Informe sua senha.");

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: eMail,
        password: pass,
      });

      if (error || !data.session) {
        setError(error?.message || "Não foi possível entrar. Verifique seus dados.");
        return;
      }

      // mantém ref na navegação? (opcional)
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Erro ao entrar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    resetMsgs();

    const eMail = cleanEmail(regEmail);
    if (!eMail) return setError("Informe um e-mail válido para criar a conta.");
    if (!regPass || regPass.length < 6) return setError("Crie uma senha com no mínimo 6 caracteres.");

    setLoading(true);
    try {
      // Se você usa confirmação por email: show mensagem de “verifique seu email”
      // Se não usa confirmação: pode logar direto.
      const redirectTo = ref
        ? `${window.location.origin}/login?ref=${encodeURIComponent(ref)}`
        : `${window.location.origin}/login`;

      const { data, error } = await supabase.auth.signUp({
        email: eMail,
        password: regPass,
        options: { emailRedirectTo: redirectTo },
      });

      if (error) {
        setError(error.message || "Não foi possível criar a conta.");
        return;
      }

      // fecha modal + limpa campos + mostra sucesso verde
      setOpenRegister(false);
      setRegEmail("");
      setRegPass("");

      // Algumas configs retornam user mas sem sessão (quando exige confirmação).
      // Por isso a mensagem “agora faça login”.
      setSuccess("Conta criada com sucesso! Agora faça login.");
    } catch (err: any) {
      setError(err?.message || "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070712] text-white">
      {/* Topbar */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070712]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 border border-white/10">
              <span className="text-sm font-black">PL</span>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">PL - Painel</div>
              <div className="text-[11px] text-white/50">Acesso ao painel</div>
            </div>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
          >
            Voltar ao site
          </Link>
        </div>
      </header>

      {/* Body */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-6 md:grid-cols-2 md:items-start">
          {/* Left: Copy */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Acesso rápido ao painel
            </div>

            <h1 className="mt-5 text-3xl font-black leading-tight tracking-tight md:text-4xl">
              Entre para gerenciar seus sites e tokens.
            </h1>

            <p className="mt-3 text-sm text-white/65">
              Se você ainda não tem conta, crie em 10 segundos e volte para fazer login.
            </p>

            {ref ? (
              <div className="mt-4 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4 text-sm text-violet-100">
                <div className="text-xs text-white/70">Você está acessando por um afiliado:</div>
                <div className="mt-1 font-bold">Código: {ref}</div>
              </div>
            ) : null}

            <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-white/60">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">✅ Painel completo</div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">✅ Sites por token</div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">✅ Pagamento PIX</div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">✅ Afiliados</div>
            </div>
          </div>

          {/* Right: Login Card */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_20px_60px_rgba(0,0,0,.45)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold">Entrar</div>
                <div className="mt-1 text-sm text-white/60">Use seu e-mail e senha.</div>
              </div>

              <button
                onClick={() => {
                  resetMsgs();
                  setOpenRegister(true);
                  setRegEmail(email || "");
                }}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
              >
                Criar conta
              </button>
            </div>

            {/* Messages */}
            {error && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {success}
              </div>
            )}

            <form onSubmit={handleLogin} className="mt-6 space-y-3">
              <div>
                <label className="text-xs text-white/70">E-mail</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@dominio.com"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-white outline-none focus:border-violet-400"
                />
              </div>

              <div>
                <label className="text-xs text-white/70">Senha</label>
                <input
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  type="password"
                  placeholder="••••••••"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-white outline-none focus:border-violet-400"
                />
              </div>

              <button
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-500 disabled:opacity-60"
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>

              <div className="pt-2 text-center text-xs text-white/60">
                Ao entrar, você concorda com os termos da plataforma.
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Register Modal */}
      {openRegister ? (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b1220] p-6 shadow-[0_20px_60px_rgba(0,0,0,.55)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-bold">Criar conta</div>
                <div className="mt-1 text-sm text-white/60">
                  Preencha os dados e depois volte pro login.
                </div>
              </div>

              <button
                onClick={() => setOpenRegister(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegister} className="mt-5 space-y-3">
              <div>
                <label className="text-xs text-white/70">E-mail</label>
                <input
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="seuemail@dominio.com"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-white outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-xs text-white/70">Senha</label>
                <input
                  value={regPass}
                  onChange={(e) => setRegPass(e.target.value)}
                  type="password"
                  placeholder="mínimo 6 caracteres"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-white outline-none focus:border-emerald-400"
                />
              </div>

              <button
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                {loading ? "Criando..." : "Criar conta"}
              </button>

              <div className="pt-2 text-center text-xs text-white/60">
                Já tem conta?{" "}
                <button
                  type="button"
                  onClick={() => setOpenRegister(false)}
                  className="font-semibold text-white hover:underline"
                >
                  Voltar pro login
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
