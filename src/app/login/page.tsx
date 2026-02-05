"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const supabase = supabaseBrowser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      return setErr(error.message);
    }

    // ✅ confirma que a sessão existe (em prod isso pega vários casos)
    const session = data?.session ?? (await supabase.auth.getSession()).data.session;

    setLoading(false);

    if (!session) {
      return setErr("Login efetuado, mas a sessão não foi criada. Tente novamente.");
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white/5 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,.25)] p-6">
        <h1 className="text-2xl font-semibold">Entrar</h1>
        <p className="text-white/70 mt-1">Acesse o painel do plpainel.</p>

        <form className="mt-6 space-y-3" onSubmit={onSubmit}>
          <input
            className="w-full rounded-xl bg-white/5 border border-white/10 p-3"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            className="w-full rounded-xl bg-white/5 border border-white/10 p-3"
            placeholder="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          {err && <div className="text-red-300 text-sm">{err}</div>}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 transition p-3 font-medium"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-4 text-sm text-white/70">
          Não tem conta?{" "}
          <a className="text-white underline" href="/register">
            Criar conta
          </a>
        </div>
      </div>
    </div>
  );
}
