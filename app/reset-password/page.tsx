"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

function readRecoveryParams() {
  if (typeof window === "undefined") return new URLSearchParams();

  const hash = window.location.hash?.startsWith("#")
    ? window.location.hash.slice(1)
    : "";
  const search = window.location.search?.startsWith("?")
    ? window.location.search.slice(1)
    : "";

  return new URLSearchParams(hash || search);
}

export default function ResetPasswordPage() {
  const [checking, setChecking] = useState(true);
  const [canReset, setCanReset] = useState(false);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"error" | "success">("error");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let mounted = true;

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY") {
        setCanReset(true);
        setChecking(false);
      }
    });

    async function loadRecoverySession() {
      setChecking(true);

      const params = readRecoveryParams();
      const urlError = params.get("error_description") || params.get("error");

      if (urlError) {
        setMessage(decodeURIComponent(urlError));
        setMessageType("error");
        setCanReset(false);
        setChecking(false);
        return;
      }

      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!mounted) return;

        if (error) {
          setMessage(error.message || "Link de recuperacao invalido ou expirado.");
          setMessageType("error");
          setCanReset(false);
        } else {
          window.history.replaceState({}, document.title, "/reset-password");
          setCanReset(true);
        }

        setChecking(false);
        return;
      }

      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      if (data.session) {
        setCanReset(true);
      } else {
        setMessage("Link de recuperacao invalido ou expirado. Solicite um novo link no login.");
        setMessageType("error");
        setCanReset(false);
      }

      setChecking(false);
    }

    loadRecoverySession();

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setMessageType("error");

    if (!canReset) {
      setMessage("Solicite um novo link de recuperacao no login.");
      return;
    }

    if (password.length < 6) {
      setMessage("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== password2) {
      setMessage("As senhas nao conferem.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setMessage(error.message || "Nao foi possivel atualizar a senha.");
        setMessageType("error");
        return;
      }

      await supabase.auth.signOut();
      setDone(true);
      setPassword("");
      setPassword2("");
      setMessage("Senha atualizada com sucesso. Entre novamente com a nova senha.");
      setMessageType("success");
    } catch (err: any) {
      setMessage(err?.message || "Erro ao atualizar a senha.");
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  }

  const messageClass =
    messageType === "success"
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

        <div className="w-full max-w-md rounded-[1.35rem] border border-[var(--panel-line)] bg-white/90 p-7 shadow-[var(--panel-shadow)] backdrop-blur-xl">
          <div className="mb-2 inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black text-[var(--panel-green-2)]">
            Recuperacao de senha
          </div>
          <h1 className="text-3xl font-black tracking-tight">Nova senha</h1>
          <p className="mt-1 text-sm text-[var(--panel-muted)]">
            Crie uma nova senha para voltar a acessar sua conta.
          </p>

          {message && (
            <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${messageClass}`}>
              {message}
            </div>
          )}

          {checking ? (
            <div className="mt-6 rounded-2xl border border-[var(--panel-line)] bg-white px-4 py-4 text-sm font-bold text-[var(--panel-muted)]">
              Validando link de recuperacao...
            </div>
          ) : done ? (
            <Link href="/login" className="pl-btn pl-btn-primary mt-6 w-full justify-center py-3">
              VOLTAR PARA O LOGIN
            </Link>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-black uppercase tracking-[0.08em] text-[var(--panel-muted)]">
                  Nova senha
                </label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="min. 6 caracteres"
                  type="password"
                  disabled={!canReset || saving}
                  className="mt-2 w-full rounded-2xl border border-[var(--panel-line)] bg-white px-4 py-3 text-[var(--panel-ink)] outline-none transition placeholder:text-[var(--panel-muted)]/70 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-[0.08em] text-[var(--panel-muted)]">
                  Confirmar nova senha
                </label>
                <input
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  placeholder="repita a nova senha"
                  type="password"
                  disabled={!canReset || saving}
                  className="mt-2 w-full rounded-2xl border border-[var(--panel-line)] bg-white px-4 py-3 text-[var(--panel-ink)] outline-none transition placeholder:text-[var(--panel-muted)]/70 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                disabled={!canReset || saving}
                className="pl-btn pl-btn-primary w-full justify-center py-3 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Salvando..." : "ATUALIZAR SENHA"}
              </button>

              <Link href="/login" className="pl-btn w-full justify-center py-3">
                VOLTAR PRO LOGIN
              </Link>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
