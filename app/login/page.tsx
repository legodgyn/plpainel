

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

  const [openRegister, setOpenRegister] = useState(false);
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regWhatsapp, setRegWhatsapp] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPassword2, setRegPassword2] = useState("");
  const [loadingRegister, setLoadingRegister] = useState(false);
  const [regMsg, setRegMsg] = useState<string | null>(null);

  const canSubmitLogin = useMemo(() => {
    return email.trim().length > 3 && password.trim().length >= 6 && !loadingLogin;
  }, [email, password, loadingLogin]);

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

  const msgBoxClass =
    msgType === "success"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
      : "border-red-500/20 bg-red-500/10 text-red-200";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#08111f] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-180px] h-[620px] w-[920px] -translate-x-1/2 rounded-full bg-violet-700/25 blur-3xl" />
        <div className="absolute left-[-140px] top-[260px] h-[320px] w-[320px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute right-[-120px] top-[160px] h-[360px] w-[360px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-[-120px] left-1/2 h-[240px] w-[640px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_30%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4 py-10">
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-violet-500/20 blur-2xl" />
            <div className="relative flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="PL Painel"
                width={260}
                height={90}
                className="h-16 w-auto object-contain sm:h-20"
                priority
              />
            </div>
          </div>
        </div>

        <div className="w-full max-w-md">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.06] p-7 shadow-[0_30px_120px_rgba(0,0,0,.55)] backdrop-blur-xl">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Login</h1>
              <p className="mt-1 text-sm text-white/60">
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
                <label className="text-xs font-medium text-white/70">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-[#0b1220]/80 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/25"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-white/70">Senha</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  type="password"
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-[#0b1220]/80 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/25"
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                disabled={!canSubmitLogin}
                className="w-full rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-4 py-3 text-sm font-bold text-white shadow-[0_12px_40px_rgba(139,92,246,.35)] transition hover:scale-[1.01] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              >
                {loadingLogin ? "Entrando..." : "Entrar"}
              </button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleOpenRegister}
                  className="text-sm font-semibold text-emerald-300 transition hover:text-emerald-200"
                >
                  CRIAR CONTA
                </button>

                <div className="text-xs text-white/45">Use um e-mail válido 😉</div>
              </div>
            </form>
          </div>

          <div className="mt-6 text-center text-xs text-white/35">
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
            <div className="w-full max-w-md rounded-[30px] border border-white/10 bg-[#0b1220]/95 p-6 shadow-[0_30px_120px_rgba(0,0,0,.7)] backdrop-blur-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-bold tracking-tight">CRIAR CONTA</div>
                  <div className="mt-1 text-sm text-white/60">
                    Preencha os dados para criar sua conta.
                  </div>
                </div>

                <button
                  onClick={() => setOpenRegister(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10"
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
                  <label className="text-xs font-medium text-white/70">Nome* (Obrigatório)</label>
                  <input
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Seu nome"
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none transition placeholder:text-white/35 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                    autoComplete="name"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-white/70">WhatsApp* (Obrigatório)</label>
                  <input
                    value={regWhatsapp}
                    onChange={(e) => setRegWhatsapp(formatBRPhone(e.target.value))}
                    placeholder="(62) 99999-9999"
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none transition placeholder:text-white/35 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                    autoComplete="tel"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-white/70">Email* (Obrigatório)</label>
                  <input
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none transition placeholder:text-white/35 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-white/70">Senha* (Obrigatório)</label>
                  <input
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="mín. 6 caracteres"
                    type="password"
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none transition placeholder:text-white/35 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                    autoComplete="new-password"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-white/70">Confirmar senha* (Obrigatório)</label>
                  <input
                    value={regPassword2}
                    onChange={(e) => setRegPassword2(e.target.value)}
                    placeholder="repita a senha"
                    type="password"
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none transition placeholder:text-white/35 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                    autoComplete="new-password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loadingRegister}
                  className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 px-4 py-3 text-sm font-bold text-white shadow-[0_12px_40px_rgba(16,185,129,.25)] transition hover:scale-[1.01] hover:opacity-95 disabled:opacity-60 disabled:hover:scale-100"
                >
                  {loadingRegister ? "Criando..." : "CRIAR CONTA"}
                </button>

                <button
                  type="button"
                  onClick={() => setOpenRegister(false)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10"
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
