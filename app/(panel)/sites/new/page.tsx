"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseMetaTag(input: string) {
  const raw = String(input || "").trim();
  if (!raw) return { name: null as string | null, content: null as string | null };

  // Se o usuário colar só um código, assume facebook-domain-verification
  if (!raw.toLowerCase().includes("<meta")) {
    return { name: "facebook-domain-verification", content: raw };
  }

  const nameMatch = raw.match(/name\s*=\s*["']([^"']+)["']/i);
  const contentMatch = raw.match(/content\s*=\s*["']([^"']+)["']/i);

  return {
    name: nameMatch?.[1] ?? null,
    content: contentMatch?.[1] ?? null,
  };
}

type TokenRow = {
  balance: number | null;
};

export default function NewSitePage() {
  const router = useRouter();

  // ✅ cria supabase SOMENTE no browser (evita quebrar build/prerender)
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [supabaseInitError, setSupabaseInitError] = useState<string | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      setSupabaseInitError(
        "Variáveis do Supabase não encontradas. Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY na Vercel (Production/Preview) e faça redeploy."
      );
      return;
    }

    setSupabase(createClient(url, key));
  }, []);

  // ✅ Tokens
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);

  // Campos do site
  const [slug, setSlug] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [mission, setMission] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState(""); // opcional
  const [whatsapp, setWhatsapp] = useState("");
  const [about, setAbout] = useState("");
  const [privacy, setPrivacy] = useState("");
  const [footer, setFooter] = useState("");

  // Meta tag (cliente cola a tag completa) - ✅ opcional
  const [metaTag, setMetaTag] = useState("");

  // UX
  const [loading, setLoading] = useState(false);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugOk, setSlugOk] = useState<boolean | null>(null);

  const noTokens = !balanceLoading && (balance ?? 0) <= 0;

  // Instagram é o único opcional (meta tag também é opcional)
  const allRequiredFilled = useMemo(() => {
    return (
      slug.trim() &&
      companyName.trim() &&
      cnpj.trim() &&
      mission.trim() &&
      phone.trim() &&
      email.trim() &&
      whatsapp.trim() &&
      about.trim() &&
      privacy.trim() &&
      footer.trim()
    );
  }, [slug, companyName, cnpj, mission, phone, email, whatsapp, about, privacy, footer]);

  useEffect(() => {
    // auto-slug a partir do nome, se slug vazio
    if (!slug.trim() && companyName.trim()) {
      setSlug(slugify(companyName));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyName]);

  // ✅ Carrega saldo de tokens ao abrir a página
  useEffect(() => {
    if (!supabase) return;

    let alive = true;

    async function loadBalance() {
      setBalanceLoading(true);

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!alive) return;

      if (!user || userErr) {
        setBalance(0);
        setBalanceLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_token_balances")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle<TokenRow>();

      if (!alive) return;

      if (error) {
        setBalance(0);
      } else {
        setBalance(data?.balance ?? 0);
      }

      setBalanceLoading(false);
    }

    loadBalance();

    return () => {
      alive = false;
    };
  }, [supabase]);

  async function checkSlugExists(s: string) {
    if (!supabase) return;

    const clean = slugify(s);
    if (!clean) return;

    setCheckingSlug(true);
    setSlugOk(null);

    const { data, error } = await supabase.from("sites").select("id").eq("slug", clean).limit(1);

    setCheckingSlug(false);

    if (error) {
      setSlugOk(null);
      return;
    }
    setSlugOk(!(data && data.length > 0));
  }

  async function handleCreate() {
    if (!supabase) {
      alert(supabaseInitError || "Supabase não inicializou.");
      return;
    }

    const cleanSlug = slugify(slug);

    // ✅ trava por tokens
    if (balanceLoading) {
      alert("Aguarde: verificando tokens...");
      return;
    }
    if ((balance ?? 0) <= 0) {
      alert("Você está sem tokens. Compre tokens para criar um site.");
      router.push("/tokens");
      return;
    }

    if (!allRequiredFilled) {
      alert("Preencha todos os campos obrigatórios (Instagram e Meta Tag são opcionais).");
      return;
    }

    if (cleanSlug.length < 3) {
      alert("Slug muito curto. Use pelo menos 3 caracteres.");
      return;
    }

    // valida meta tag (só se foi preenchida)
    const parsedMeta = parseMetaTag(metaTag);
    if (metaTag.trim().toLowerCase().includes("<meta") && (!parsedMeta.name || !parsedMeta.content)) {
      alert("Meta tag inválida. Cole a tag completa do Business Manager ou deixe em branco.");
      return;
    }

    setLoading(true);
    try {
      // checa sessão
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        router.push("/login");
        return;
      }

      // checa slug antes de criar
      const { data: exists } = await supabase.from("sites").select("id").eq("slug", cleanSlug).limit(1);

      if (exists && exists.length > 0) {
        alert("Esse slug já existe. Escolha outro.");
        setLoading(false);
        return;
      }

      // RPC que cria site e debita token
      const { error } = await supabase.rpc("create_site_with_token", {
        p_slug: cleanSlug,
        p_company_name: companyName.trim(),
        p_cnpj: cnpj.trim(),
        p_mission: mission.trim(),
        p_phone: phone.trim(),
        p_email: email.trim(),
        p_instagram: instagram.trim() || null,
        p_whatsapp: whatsapp.trim(),
        p_about: about.trim(),
        p_footer: footer.trim(),
      });

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      // Atualiza campos extras (privacy + meta opcional)
      const upd = await supabase
        .from("sites")
        .update({
          privacy: privacy.trim(),
          meta_verify_name: parsedMeta.name,
          meta_verify_content: parsedMeta.content,
          is_public: true,
        })
        .eq("slug", cleanSlug);

      if (upd.error) {
        alert("Site criado, mas falhou ao salvar Privacidade/Meta. Vá em Editar e salve novamente.");
      }

      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  const createDisabled =
    loading || balanceLoading || !supabase || noTokens || slugOk === false || checkingSlug;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-white">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Criar Site</h1>
        <Link href="/dashboard" className="text-sm text-white/70 hover:text-white">
          ← Voltar para o Dashboard
        </Link>
      </div>

      {supabaseInitError ? (
        <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {supabaseInitError}
        </div>
      ) : null}

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        {/* ✅ tokens */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <div className="text-sm text-white/75">
            Tokens disponíveis:{" "}
            <span className="font-semibold text-white">
              {!supabase ? "..." : balanceLoading ? "..." : balance ?? 0}
            </span>
          </div>

          {noTokens ? (
            <Link
              href="/tokens"
              className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500"
            >
              Comprar tokens
            </Link>
          ) : null}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Domínio" required hint="Ex: minha-empresa (sempre use o HIFEN para separar)">
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              onBlur={() => checkSlugExists(slug)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400/40"
              placeholder="minha-empresa"
            />
            <div className="mt-2 text-xs text-white/60">
              {checkingSlug ? (
                "Verificando slug..."
              ) : slugOk === null ? null : slugOk ? (
                <span className="text-emerald-300">Slug disponível ✅</span>
              ) : (
                <span className="text-red-300">Slug já existe ❌</span>
              )}
            </div>
          </Field>

          <Field label="Nome da Empresa" required>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400/40"
              placeholder="Minha Empresa LTDA"
            />
          </Field>

          <Field label="CNPJ" required>
            <input
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400/40"
              placeholder="00.000.000/0000-00"
            />
          </Field>

          <Field label="Telefone" required>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400/40"
              placeholder="(11) 99999-9999"
            />
          </Field>

          <Field label="E-mail" required>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400/40"
              placeholder="contato@empresa.com"
            />
          </Field>

          <Field label="WhatsApp" required hint="Pode ser com DDD. Ex: 11999999999">
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400/40"
              placeholder="11999999999"
            />
          </Field>

          <Field label="Instagram" required={false} hint="Opcional (pode colar @usuario ou link)">
            <input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400/40"
              placeholder="@minhaempresa"
            />
          </Field>

          {/* ✅ meta tag opcional */}
          <Field
            label="Meta tag de verificação"
            required={false}
            hint='Opcional. Crie o site sem a meta tag. Depois que pegar no Business Manager, volte em "Editar" e cole.'
          >
            <input
              value={metaTag}
              onChange={(e) => setMetaTag(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400/40"
              placeholder='<meta name="facebook-domain-verification" content="..." />'
            />
          </Field>
        </div>

        <div className="mt-6 grid gap-5">
          <Field label="Nossa missão" required>
            <textarea
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              className="min-h-[90px] w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400/40"
              placeholder="Escreva a missão..."
            />
          </Field>

          <Field label="Quem somos (Sobre N)" required>
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              className="min-h-[140px] w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400/40"
              placeholder="Texto completo..."
            />
          </Field>

          <Field label="Política de Privacidade" required>
            <textarea
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value)}
              className="min-h-[160px] w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400/40"
              placeholder="Texto da política..."
            />
          </Field>

          <Field label="Rodapé" required>
            <textarea
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              className="min-h-[90px] w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400/40"
              placeholder="Texto do rodapé..."
            />
          </Field>
        </div>

        <button
          onClick={handleCreate}
          disabled={createDisabled}
          className="mt-6 w-full rounded-2xl bg-violet-600 px-5 py-4 font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Criando..."
            : !supabase
              ? "Inicializando Supabase..."
              : balanceLoading
                ? "Verificando tokens..."
                : noTokens
                  ? "Sem tokens (compre para criar)"
                  : "Criar site (consome 1 token)"}
        </button>

        <p className="mt-3 text-center text-xs text-white/55">
          Campos obrigatórios: todos, exceto Instagram e Meta tag.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  const showAsterisk = typeof required === "boolean" ? required : true;

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-white/85">
        {label} {showAsterisk && <span className="text-red-300">*</span>}
      </div>
      {children}
      {hint ? <div className="text-xs text-white/55">{hint}</div> : null}
    </div>
  );
}