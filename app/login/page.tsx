"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

export default function LoginPage() {
  const router = useRouter();

  // Login form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // UI states
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Register modal
  const [openRegister, setOpenRegister] = useState(false);
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPassword2, setRegPassword2] = useState("");
  const [loadingRegister, setLoadingRegister] = useState(false);
  const [regMsg, setRegMsg] = useState<string | null>(null);

  const canSubmitLogin = useMemo(() => {
    return email.trim().length > 3 && password.trim().length >= 6 && !loadingLogin;
  }, [email, password, loadingLogin]);

  // Fecha modal com ESC
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenRegister(false);
    }
    if (openRegister) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openRegister]);

  async function handleLogin(e?: React.FormEvent) {
    e?.preventDefault();
    setMsg(null);

    const e1 = email.trim().toLowerCase();
    const p1 = password;

    if (!e1) return setMsg("Digite seu e-mail.");
    if (p1.length < 6) return setMsg("Digite sua senha (mín. 6 caracteres).");

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

  async function handleOpenRegister() {
    // limpa e abre
    setRegMsg(null);
    setRegName("");
    setRegEmail(email || "");
    setRegPassword("");
    setRegPassword2("");
    setOpenRegister(true);
  }

  async function handleRegister(e?: React.FormEvent) {
    e?.preventDefault();
    setRegMsg(null);

    const e1 = regEmail.trim().toLowerCase();
    const p1 = regPassword;

    if (!e1) return setRegMsg("Digite um e-mail.");
    if (p1.length < 6) return setRegMsg("Crie uma senha com no mínimo 6 caracteres.");
    if (regPassword2 !== p1) return setRegMsg("As senhas não conferem.");

    setLoadingRegister(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: e1,
        password: p1,
        options: {
          data: {
            name: regName.trim() || null,
          },
        },
      });

      if (error) {
        setRegMsg(error.message || "Não foi possível criar a conta.");
        return;
      }

      // Em muitos projetos o Supabase pede confirmação por e-mail.
      // De qualquer forma, voltamos pro login com o e-mail preenchido.
      setEmail(e1);
      setPassword("");
      setOpenRegister(false);
      setMsg(
        data?.user
          ? "Conta criada! Agora faça login (se precisar, confirme o e-mail)."
          : "Conta criada! Agora faça login."
      );
    } catch (err: any) {
      setRegMsg(err?.message || "Erro ao criar conta.");
    } finally {
      setLoadingRegister(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0b1220] text-white">
      {/* BG glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[860px] -translate-x-1/2 rounded-full bg-violet-700/20 blur-3xl" />
        <div className="absolute top-40 right-[-120px] h-[360px] w-[360px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute top-56 left-[-140px] h-[360px] w-[360px] rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-7 shadow-[0_24px_80px_rgba(0,0,0,.45)]">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/10 font-black">
                PL
              </div>
              <div>
                <div className="text-xl font-bold">Login</div>
                <div className="text-sm text-white/60">Entre com sua conta para acessar o painel.</div>
              </div>
            </div>

            {msg && (
              <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {msg}
              </div>
            )}

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label className="text-xs text-white/70">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-violet-400"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="text-xs text-white/70">Senha</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  type="password"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-violet-400"
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                disabled={!canSubmitLogin}
                className="w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold hover:bg-violet-500 disabled:opacity-60"
              >
                {loadingLogin ? "Entrando..." : "Entrar"}
              </button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleOpenRegister}
                  className="text-sm font-semibold text-emerald-200 hover:text-emerald-100"
                >
                  Criar conta
                </button>

                <div className="text-xs text-white/50">
                  Use um e-mail válido 😉
                </div>
              </div>
            </form>
          </div>

          <div className="mt-5 text-center text-xs text-white/45">
            © {new Date().getFullYear()} PL - Painel
          </div>
        </div>
      </div>

      {/* Register Modal */}
      {openRegister && (
        <div className="fixed inset-0 z-[999]">
          {/* overlay */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={() => setOpenRegister(false)}
          />
          {/* modal */}
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b1220] p-6 shadow-[0_30px_120px_rgba(0,0,0,.65)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-bold">Criar conta</div>
                  <div className="mt-1 text-sm text-white/60">
                    Preencha os dados e depois você volta pro login.
                  </div>
                </div>

                <button
                  onClick={() => setOpenRegister(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>

              {regMsg && (
                <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {regMsg}
                </div>
              )}

              <form onSubmit={handleRegister} className="mt-5 space-y-4">
                <div>
                  <label className="text-xs text-white/70">Nome (opcional)</label>
                  <input
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Seu nome"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-emerald-400"
                    autoComplete="name"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/70">Email</label>
                  <input
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-emerald-400"
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/70">Senha</label>
                  <input
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="mín. 6 caracteres"
                    type="password"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-emerald-400"
                    autoComplete="new-password"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/70">Confirmar senha</label>
                  <input
                    value={regPassword2}
                    onChange={(e) => setRegPassword2(e.target.value)}
                    placeholder="repita a senha"
                    type="password"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-emerald-400"
                    autoComplete="new-password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loadingRegister}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  {loadingRegister ? "Criando..." : "Criar conta"}
                </button>

                <button
                  type="button"
                  onClick={() => setOpenRegister(false)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10"
                >
                  Voltar pro login
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
