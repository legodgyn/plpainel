"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

function getStoredRef() {
  if (typeof window === "undefined") return "";
  return (localStorage.getItem("affiliate_ref") || "").trim();
}

function setStoredRef(v: string) {
  if (typeof window === "undefined") return;
  const code = (v || "").trim();
  if (code) localStorage.setItem("affiliate_ref", code);
}

async function tryCreateReferral(code: string) {
  const ref = (code || "").trim();
  if (!ref) return;

  // precisa estar logado
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return;

  // 1) Descobre qual é o afiliado dono desse code
  const { data: aff, error: affErr } = await supabase
    .from("affiliates")
    .select("user_id, code")
    .eq("code", ref)
    .maybeSingle();

  if (affErr) {
    console.error("affiliates lookup error:", affErr);
    return;
  }

  // se não existir esse código, não grava nada
  if (!aff?.user_id) {
    console.warn("affiliate code not found:", ref);
    return;
  }

  // evita auto-ref (afiliado indicando ele mesmo)
  if (aff.user_id === user.id) return;

  // 2) Insere o vínculo
  const { error } = await supabase.from("referrals").insert({
    referred_user_id: user.id,
    affiliate_user_id: aff.user_id,
    code: ref,
  });

  // se já existe, ignora
  if (error && !String(error.message || "").toLowerCase().includes("duplicate")) {
    console.error("referrals insert error:", error);
  }
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ✅ captura ref se vier na URL do login (sem useSearchParams, evita erro de build)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const qs = new URLSearchParams(window.location.search);
    const refFromUrl = (qs.get("ref") || qs.get("affiliate") || "").trim();

    if (refFromUrl) setStoredRef(refFromUrl);
  }, []);

  async function signIn() {
    setMsg(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error) {
      setLoading(false);
      return setMsg(error.message);
    }

    // ✅ fallback: se por algum motivo o signup não gravou, grava aqui
    await tryCreateReferral(getStoredRef());

    setLoading(false);
    router.push("/dashboard");
  }

  async function signUp() {
    setMsg(null);
    setLoading(true);

    const ref = getStoredRef();

    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
    });

    if (error) {
      setLoading(false);
      return setMsg(error.message);
    }

    // ✅ tenta gravar agora (se o fluxo retornar user logado, grava)
    // se não retornar (confirmação por e-mail), o login vai gravar depois
    await tryCreateReferral(ref);

    setLoading(false);
    setMsg("Conta criada! Agora faça login.");
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
