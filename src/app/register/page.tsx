"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function RegisterPage() {
  const supabase = supabaseBrowser();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    setLoading(false);
    if (error) return setErr(error.message);

    window.location.href = "/dashboard";
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white/5 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,.25)] p-6">
        <h1 className="text-2xl font-semibold">Criar conta</h1>
        <p className="text-white/70 mt-1">Ganhe 1 token ao se cadastrar.</p>

        <form className="mt-6 space-y-3" onSubmit={onSubmit}>
          <input
            className="w-full rounded-xl bg-white/5 border border-white/10 p-3"
            placeholder="Nome"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <input
            className="w-full rounded-xl bg-white/5 border border-white/10 p-3"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full rounded-xl bg-white/5 border border-white/10 p-3"
            placeholder="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {err && <div className="text-red-300 text-sm">{err}</div>}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 transition p-3 font-medium"
          >
            {loading ? "Criando..." : "Criar conta"}
          </button>
        </form>

        <div className="mt-4 text-sm text-white/70">
          Já tem conta?{" "}
          <a className="text-white underline" href="/login">
            Entrar
          </a>
        </div>
      </div>
    </div>
  );
}
