"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

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

  const [openRegister, setOpenRegister] = useState(false);
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regWhatsapp, setRegWhatsapp] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPassword2, setRegPassword2] = useState("");
  const [loadingRegister, setLoadingRegister] = useState(false);
  const [regMsg, setRegMsg] = useState<string | null>(null);

  const [openForgot, setOpenForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);
  const [loadingForgot, setLoadingForgot] = useState(false);

  const canSubmitLogin = useMemo(() => {
    return email.trim().length > 3 && password.trim().length >= 6 && !loadingLogin;
  }, [email, password, loadingLogin]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpenRegister(false);
        setOpenForgot(false);
      }
    }
    if (openRegister || openForgot) {
      window.addEventListener("keydown", onKeyDown);
    }
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openRegister, openForgot]);

  async function handleLogin(e?: React.FormEvent) {
    e?.preventDefault();

    setMsg(null);
    setMsgType("error");

    const e1 = email.trim().toLowerCase();
    const p1 = password;

    if (!e1) {
      setMsg("Digite seu e-mail.");
      return;
    }

    if (!isValidEmail(e1)) {
      setMsg("Digite um e-mail válido.");
      return;
    }

    if (p1.length < 6) {
      setMsg("Digite sua senha (mín. 6 caracteres).");
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

  async function handleOpenRegister() {
    setRegMsg(null);
    setRegName("");
    setRegEmail(email || "");
    setRegWhatsapp("");
    setRegPassword("");
    setRegPassword2("");
    setOpenRegister(true);
  }

  async function handleRegister(e?: React.FormEvent) {
    e?.preventDefault();
    setRegMsg(null);

    const e1 = regEmail.trim().toLowerCase();
    const w1 = onlyDigits(regWhatsapp);
    const p1 = regPassword;
    const n1 = regName.trim();

    if (!n1) return setRegMsg("Digite seu nome.");
    if (!e1) return setRegMsg("Digite um e-mail.");
    if (!isValidEmail(e1)) return setRegMsg("Digite um e-mail válido.");
    if (!w1) return setRegMsg("Digite seu WhatsApp.");
    if (w1.length < 10 || w1.length > 11) {
      return setRegMsg("Digite um WhatsApp válido com DDD.");
    }
    if (p1.length < 6) return setRegMsg("Crie uma senha com no mínimo 6 caracteres.");
    if (regPassword2 !== p1) return setRegMsg("As senhas não conferem.");

    setLoadingRegister(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: e1,
        password: p1,
        options: {
          data: {
            name: n1,
          },
        },
      });

      if (error || !data?.user) {
        setRegMsg(error?.message || "Não foi possível criar a conta.");
        return;
      }

      const { error: profileError } = await supabase.from("profiles").upsert({
        user_id: data.user.id,
        name: n1,
        whatsapp: w1,
      });

      if (profileError) {
        setRegMsg(profileError.message || "Conta criada, mas não foi possível salvar o WhatsApp.");
        return;
      }

      setEmail(e1);
      setPassword("");
      setOpenRegister(false);

      setMsgType("success");
      setMsg("Conta criada! Agora faça o login. Seu WhatsApp foi salvo com sucesso.");
    } catch (err: any) {
      setRegMsg(err?.message || "Erro ao criar conta.");
    } finally {
      setLoadingRegister(false);
    }
  }

  async function handleOpenForgot() {
    setForgotMsg(null);
    setForgotEmail(email || "");
    setOpenForgot(true);
  }

  async function handleForgotPassword(e?: React.FormEvent) {
    e?.preventDefault();
    setForgotMsg(null);

    const e1 = forgotEmail.trim().toLowerCase();

    if (!e1) {
      setForgotMsg("Digite seu e-mail.");
      return;
    }

    if (!isValidEmail(e1)) {
      setForgotMsg("Digite um e-mail válido.");
      return;
    }

    setLoadingForgot(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(e1, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setForgotMsg(error.message || "Não foi possível enviar o e-mail de recuperação.");
        return;
      }

      setForgotMsg("Enviamos um link de recuperação para o seu e-mail.");
      setMsgType("success");
      setMsg("E-mail de recuperação enviado com sucesso.");
    } catch (err: any) {
      setForgotMsg(err?.message || "Erro ao solicitar recuperação de senha.");
    } finally {
      setLoadingForgot(false);
    }
  }

  const msgBoxClass =
    msgType === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--panel-bg)] text-[var(--panel-ink)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-120px] top-[-160px] h-[420px] w-[420px] rounded-full bg-emerald-200/55 blur-3xl" />
        <div className="absolute right-[-120px] top-[120px] h-[360px] w-[360px] rounded-full bg-cyan-100/70 blur-3xl" />
        <div className="absolute bottom-[-160px] left-1/2 h-[280px] w-[760px] -translate-x-1/2 rounded-full bg-white blur-3xl" />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,.92),rgba(238,248,243,.72)_45%,rgba(244,247,246,.92))]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4 py-10">
        <div className="mb-8 flex justify-center">
          <div
            aria-label="PL Painel"
            className="h-20 w-64 bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/logo.png?v=20260514')" }}
          />
        </div>

        <div className="w-full max-w-md">
          <div className="rounded-[1.35rem] border border-[var(--panel-line)] bg-white/90 p-7 shadow-[var(--panel-shadow)] backdrop-blur-xl">
            <div>
              <div className="mb-2 inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black text-[var(--panel-green-2)]">
                Acesso ao painel
              </div>
              <h1 className="text-3xl font-black tracking-tight">Entrar</h1>
              <p className="mt-1 text-sm text-[var(--panel-muted)]">
                Entre com sua conta para acessar o painel.
              </p>
            </div>

            {msg && (
              <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${msgBoxClass}`}>
                {msg}
              </div>
            )}

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-black uppercase tracking-[0.08em] text-[var(--panel-muted)]">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="mt-2 w-full rounded-2xl border border-[var(--panel-line)] bg-white px-4 py-3 text-[var(--panel-ink)] outline-none transition placeholder:text-[var(--panel-muted)]/70 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-[0.08em] text-[var(--panel-muted)]">Senha</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  type="password"
                  className="mt-2 w-full rounded-2xl border border-[var(--panel-line)] bg-white px-4 py-3 text-[var(--panel-ink)] outline-none transition placeholder:text-[var(--panel-muted)]/70 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                disabled={!canSubmitLogin}
                className="pl-btn pl-btn-primary w-full justify-center py-3 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingLogin ? "Entrando..." : "Entrar"}
              </button>

              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleOpenRegister}
                  className="text-sm font-black text-[var(--panel-green-2)] transition hover:text-[var(--panel-green)]"
                >
                  CRIAR CONTA
                </button>

                <button
                  type="button"
                  onClick={handleOpenForgot}
                  className="text-sm font-black text-[var(--panel-muted)] transition hover:text-[var(--panel-ink)]"
                >
                  Esqueci minha senha
                </button>
              </div>

              <div className="text-center text-xs text-[var(--panel-muted)]">
                Use um e-mail válido 😉
              </div>
            </form>
          </div>

          <div className="mt-6 text-center text-xs text-[var(--panel-muted)]">
            ©️ {new Date().getFullYear()} PL - Painel
          </div>
        </div>
      </div>

      {openRegister && (
        <div className="fixed inset-0 z-[999]">
          <div
            className="absolute inset-0 bg-black/65 backdrop-blur-[4px]"
            onClick={() => setOpenRegister(false)}
          />

          <div className="absolute inset-0 flex items-center justify-center px-4 py-6">
            <div className="w-full max-w-md rounded-[1.35rem] border border-[var(--panel-line)] bg-white p-6 shadow-[var(--panel-shadow)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-black tracking-tight">Criar conta</div>
                  <div className="mt-1 text-sm text-[var(--panel-muted)]">
                    Preencha os dados para criar sua conta.
                  </div>
                </div>

                <button
                  onClick={() => setOpenRegister(false)}
                  className="rounded-xl border border-[var(--panel-line)] bg-white px-3 py-2 text-sm font-black text-[var(--panel-muted)] transition hover:bg-[#f8fbfa]"
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>

              {regMsg && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {regMsg}
                </div>
              )}

              <form onSubmit={handleRegister} className="mt-5 space-y-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-[0.08em] text-[var(--panel-muted)]">Nome* (Obrigatório)</label>
                  <input
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Seu nome"
                    className="mt-2 w-full rounded-2xl border border-[var(--panel-line)] bg-white px-4 py-3 text-[var(--panel-ink)] outline-none transition placeholder:text-[var(--panel-muted)]/70 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                    autoComplete="name"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-[0.08em] text-[var(--panel-muted)]">WhatsApp* (Obrigatório)</label>
                  <input
                    value={regWhatsapp}
                    onChange={(e) => setRegWhatsapp(formatBRPhone(e.target.value))}
                    placeholder="(62) 99999-9999"
                    className="mt-2 w-full rounded-2xl border border-[var(--panel-line)] bg-white px-4 py-3 text-[var(--panel-ink)] outline-none transition placeholder:text-[var(--panel-muted)]/70 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                    autoComplete="tel"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-[0.08em] text-[var(--panel-muted)]">Email* (Obrigatório)</label>
                  <input
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="mt-2 w-full rounded-2xl border border-[var(--panel-line)] bg-white px-4 py-3 text-[var(--panel-ink)] outline-none transition placeholder:text-[var(--panel-muted)]/70 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-[0.08em] text-[var(--panel-muted)]">Senha* (Obrigatório)</label>
                  <input
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="mín. 6 caracteres"
                    type="password"
                    className="mt-2 w-full rounded-2xl border border-[var(--panel-line)] bg-white px-4 py-3 text-[var(--panel-ink)] outline-none transition placeholder:text-[var(--panel-muted)]/70 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                    autoComplete="new-password"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-[0.08em] text-[var(--panel-muted)]">Confirmar senha* (Obrigatório)</label>
                  <input
                    value={regPassword2}
                    onChange={(e) => setRegPassword2(e.target.value)}
                    placeholder="repita a senha"
                    type="password"
                    className="mt-2 w-full rounded-2xl border border-[var(--panel-line)] bg-white px-4 py-3 text-[var(--panel-ink)] outline-none transition placeholder:text-[var(--panel-muted)]/70 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                    autoComplete="new-password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loadingRegister}
                  className="pl-btn pl-btn-primary w-full justify-center py-3 disabled:opacity-60"
                >
                  {loadingRegister ? "Criando..." : "CRIAR CONTA"}
                </button>

                <button
                  type="button"
                  onClick={() => setOpenRegister(false)}
                  className="pl-btn w-full justify-center py-3"
                >
                  VOLTAR PRO LOGIN
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {openForgot && (
        <div className="fixed inset-0 z-[999]">
          <div
            className="absolute inset-0 bg-black/65 backdrop-blur-[4px]"
            onClick={() => setOpenForgot(false)}
          />

          <div className="absolute inset-0 flex items-center justify-center px-4 py-6">
            <div className="w-full max-w-md rounded-[1.35rem] border border-[var(--panel-line)] bg-white p-6 shadow-[var(--panel-shadow)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-bold tracking-tight">RECUPERAR SENHA</div>
                  <div className="mt-1 text-sm text-[var(--panel-muted)]">
                    Digite seu e-mail para receber o link de redefinição.
                  </div>
                </div>

                <button
                  onClick={() => setOpenForgot(false)}
                  className="rounded-xl border border-[var(--panel-line)] bg-white px-3 py-2 text-sm font-black text-[var(--panel-muted)] transition hover:bg-[#f8fbfa]"
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>

              {forgotMsg && (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  {forgotMsg}
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="mt-5 space-y-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-[0.08em] text-[var(--panel-muted)]">Email</label>
                  <input
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="mt-2 w-full rounded-2xl border border-[var(--panel-line)] bg-white px-4 py-3 text-[var(--panel-ink)] outline-none transition placeholder:text-[var(--panel-muted)]/70 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                    autoComplete="email"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loadingForgot}
                  className="pl-btn pl-btn-primary w-full justify-center py-3 disabled:opacity-60"
                >
                  {loadingForgot ? "Enviando..." : "ENVIAR LINK DE RECUPERAÇÃO"}
                </button>

                <button
                  type="button"
                  onClick={() => setOpenForgot(false)}
                  className="pl-btn w-full justify-center py-3"
                >
                  VOLTAR PRO LOGIN
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
