"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

function getRefFromUrl(): string | null {
  if (typeof window === "undefined") return null;

  const sp = new URLSearchParams(window.location.search);
  const ref = (sp.get("ref") || sp.get("affiliate") || "").trim();
  return ref || null;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ✅ Captura ?ref= no /login também (caso o cara caia direto aqui)
  useEffect(() => {
    const ref = getRefFromUrl();
    if (ref) {
      localStorage.setItem("affiliate_ref", ref);
    }
  }, []);

  async function signIn() {
    setMsg(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    setLoading(false);

    if (error) return setMsg(error.message);
    router.push("/dashboard");
  }

  async function signUp() {
    setMsg(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
    });

    setLoading(false);

    if (error) return setMsg(error.message);

    // opcional: se quiser forçar confirmação de email, aqui você avisa
    // se NÃO usa confirmação, pode logar direto:
    if (data?.user) {
      setMsg("Conta criada! Agora faça login.");
    } else {
      setMsg("Conta criada! Verifique seu e-mail para confirmar, depois faça login.");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
        <h1 className="text-2xl font-semibold text-white">Login</h1>
        <p className="mt-1 text-sm text-white/60">Entre ou crie conta.</p>

        <label className="mt-5 block text-sm text-white/70">Email</label>
        <input
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-violet-400"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="mt-4 block text-sm text-white/70">Senha</label>
        <input
          type="password"
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-violet-400"
          placeholder="********"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />

        {msg && (
          <p className="mt-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80">
            {msg}
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={signIn}
            disabled={loading}
            className="rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
          >
            {loading ? "..." : "Entrar"}
          </button>

          <button
            onClick={signUp}
            disabled={loading}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-semibold text-white hover:bg-white/10 disabled:opacity-60"
          >
            Criar conta
          </button>
        </div>
      </div>
    </main>
  );
}
