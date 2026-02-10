"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

/** ===================== Helpers ===================== */

function onlyDigits(v: string) {
  return String(v || "").replace(/\D/g, "");
}

function formatCnpj(v: string) {
  const d = onlyDigits(v).slice(0, 14);

  const p1 = d.slice(0, 2);
  const p2 = d.slice(2, 5);
  const p3 = d.slice(5, 8);
  const p4 = d.slice(8, 12);
  const p5 = d.slice(12, 14);

  let out = p1;
  if (p2) out += `.${p2}`;
  if (p3) out += `.${p3}`;
  if (p4) out += `/${p4}`;
  if (p5) out += `-${p5}`;
  return out;
}

function slugify(input: string) {
  return String(input || "")
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

function normalizePhoneToDigits(v: string | null | undefined) {
  const d = onlyDigits(String(v || ""));
  return d || "";
}

type TokenRow = {
  balance: number | null;
};

type BrasilApiCnpj = {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  descricao_situacao_cadastral?: string;
  data_inicio_atividade?: string;
  capital_social?: string | number;
  porte?: string;
  natureza_juridica?: string;

  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;

  ddd_telefone_1?: string;
  ddd_telefone_2?: string;
  email?: string;
};

function buildTemplates(input: {
  companyName: string;
  cnpj: string;
  addressLine: string;
  cityUfCep: string;
  email: string;
  phone: string;
}) {
  const { companyName, cnpj, addressLine, cityUfCep, email, phone } = input;

  const mission = `A missão da ${companyName} é desenvolver e executar soluções estratégicas e eficientes, orientadas a resultados, que fortaleçam a presença de marcas, ampliem oportunidades de negócio e impulsionem o crescimento sustentável de nossos clientes.

Trabalhamos com foco em qualidade, análise, criatividade, ética e comprometimento. Nosso propósito é gerar valor real por meio de entregas bem estruturadas, comunicação assertiva e gestão responsável, sempre alinhados às necessidades e objetivos de cada cliente.`;

  const about = `QUEM SOMOS?

A ${companyName}, registrada sob o CNPJ ${cnpj}, atua oferecendo soluções empresariais e operacionais estruturadas, com foco em eficiência, organização e suporte a operações que demandam gestão e execução responsável.

Localizada em ${addressLine}, ${cityUfCep}, trabalhamos com atendimento próximo, compromisso com a conformidade e foco em resultados consistentes por meio de processos bem definidos e relações transparentes.

Se quiser conhecer melhor nossas soluções e serviços, fale com a gente.`;

  const privacy = `POLÍTICA DE PRIVACIDADE

${companyName}
CNPJ: ${cnpj}
Endereço: ${addressLine}, ${cityUfCep}

1. Finalidade
Esta Política de Privacidade descreve como coletamos, utilizamos, armazenamos e protegemos dados pessoais de clientes, parceiros e usuários que interagem conosco por meio de nossos canais (site, e-mail, telefone e redes sociais) ou durante a contratação e execução de serviços.

2. Dados Coletados
Coletamos apenas dados necessários para:
- Atendimento, propostas e prestação de serviços;
- Comunicação operacional, administrativa e contratual;
- Cumprimento de obrigações legais e regulatórias.

3. Uso dos Dados
Os dados são utilizados exclusivamente para as finalidades descritas acima. Não enviamos comunicações promocionais sem consentimento quando aplicável.

4. Compartilhamento
Não comercializamos dados pessoais. Compartilhamento ocorre apenas:
- Com fornecedores/parceiros necessários à execução, sob confidencialidade;
- Por exigência legal ou ordem de autoridade competente.

5. Direitos do Titular (LGPD)
O titular pode solicitar: acesso, correção, atualização, eliminação/anonimização quando aplicável, portabilidade e revogação de consentimentos.

6. Segurança e Armazenamento
Adotamos medidas técnicas e administrativas para proteger dados contra acessos não autorizados. Os dados são armazenados pelo período necessário às finalidades e obrigações legais.

7. Alterações
Esta política pode ser atualizada periodicamente.

8. Contato
📧 E-mail: ${email || "—"}
📞 Telefone: ${phone || "—"}

© ${new Date().getFullYear()} ${companyName}. Todos os direitos reservados.`;

  const footer = `${companyName} | CNPJ: ${cnpj} | Endereço: ${addressLine}, ${cityUfCep} | Contato: 📧 ${email || "—"} • 📞 ${
    phone || "—"
  } | © ${new Date().getFullYear()} ${companyName}. Todos os direitos reservados.`;

  return { mission, about, privacy, footer };
}

/** ===================== Page ===================== */

export default function NewSitePage() {
  const router = useRouter();

  // ✅ Igual seu Dashboard: nunca null
  const supabase = useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
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

  // Meta tag (opcional)
  const [metaTag, setMetaTag] = useState("");

  // UX
  const [loading, setLoading] = useState(false);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugOk, setSlugOk] = useState<boolean | null>(null);

  // CNPJ autofill
  const cnpjDigits = useMemo(() => onlyDigits(cnpj), [cnpj]);
  const cnpjValid = cnpjDigits.length === 14;
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjMsg, setCnpjMsg] = useState<string | null>(null);

  const noTokens = !balanceLoading && (balance ?? 0) <= 0;

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

      if (error) setBalance(0);
      else setBalance(data?.balance ?? 0);

      setBalanceLoading(false);
    }

    loadBalance();
    return () => {
      alive = false;
    };
  }, [supabase]);

  async function checkSlugExists(s: string) {
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

  async function handleGenerateFromCnpj() {
    const digits = cnpjDigits;

    if (digits.length !== 14) {
      setCnpjMsg("CNPJ inválido. Digite um CNPJ com 14 números.");
      return;
    }

    setCnpjMsg(null);
    setCnpjLoading(true);

    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        setCnpjMsg("Não consegui puxar esse CNPJ. Verifique e tente novamente.");
        setCnpjLoading(false);
        return;
      }

      const j = (await res.json()) as BrasilApiCnpj;

      const nome = (j.nome_fantasia || j.razao_social || "").trim();
      if (nome) setCompanyName(nome);

      const apiEmail = String(j.email || "").trim();
      if (apiEmail && !email.trim()) setEmail(apiEmail);

      const tel = normalizePhoneToDigits(j.ddd_telefone_1 || j.ddd_telefone_2);
      if (tel && !phone.trim()) setPhone(tel);
      if (tel && !whatsapp.trim()) setWhatsapp(tel);

      const addressLine = [
        j.logradouro,
        j.numero ? `nº ${j.numero}` : null,
        j.complemento,
        j.bairro,
      ]
        .filter(Boolean)
        .join(", ");

      const cityUfCep = [j.municipio, j.uf, j.cep].filter(Boolean).join(" – ");

      const templates = buildTemplates({
        companyName: nome || companyName || "Sua Empresa",
        cnpj: formatCnpj(digits),
        addressLine: addressLine || "—",
        cityUfCep: cityUfCep || "—",
        email: apiEmail || email || "—",
        phone: tel || phone || "—",
      });

      if (!mission.trim()) setMission(templates.mission);
      if (!about.trim()) setAbout(templates.about);
      if (!privacy.trim()) setPrivacy(templates.privacy);
      if (!footer.trim()) setFooter(templates.footer);

      setCnpjMsg("Dados gerados com sucesso ✅");
    } catch {
      setCnpjMsg("Erro ao gerar dados. Tente novamente.");
    } finally {
      setCnpjLoading(false);
    }
  }

  async function handleCreate() {
    const cleanSlug = slugify(slug);

    // tokens
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

    const parsedMeta = parseMetaTag(metaTag);
    if (metaTag.trim().toLowerCase().includes("<meta") && (!parsedMeta.name || !parsedMeta.content)) {
      alert("Meta tag inválida. Cole a tag completa do Business Manager ou deixe em branco.");
      return;
    }

    setLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        router.push("/login");
        return;
      }

      const { data: exists } = await supabase.from("sites").select("id").eq("slug", cleanSlug).limit(1);
      if (exists && exists.length > 0) {
        alert("Esse slug já existe. Escolha outro.");
        return;
      }

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
        return;
      }

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
    loading || balanceLoading || noTokens || slugOk === false || checkingSlug;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-white">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Criar Site</h1>
        <Link href="/dashboard" className="text-sm text-white/70 hover:text-white">
          ← Voltar para o Dashboard
        </Link>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        {/* tokens */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <div className="text-sm text-white/75">
            Tokens disponíveis:{" "}
            <span className="font-semibold text-white">
              {balanceLoading ? "..." : balance ?? 0}
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
          <Field label="CNPJ" required hint="Digite o CNPJ e clique em “Gerar dados” para preencher automático.">
            <div className="flex gap-2">
              <input
                value={cnpj}
                onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && cnpjValid && !cnpjLoading) {
                    e.preventDefault();
                    handleGenerateFromCnpj();
                  }
                }}
                inputMode="numeric"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400/40"
                placeholder="00.000.000/0000-00"
              />
              <button
                type="button"
                onClick={handleGenerateFromCnpj}
                disabled={!cnpjValid || cnpjLoading}
                className="shrink-0 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cnpjLoading ? "Gerando..." : cnpjValid ? "Gerar dados" : "Digite o CNPJ"}
              </button>
            </div>

            {cnpjMsg ? <div className="mt-2 text-xs text-white/70">{cnpjMsg}</div> : null}
          </Field>

          <Field label="Domínio (slug)" required hint="Ex: minha-empresa (use hífen)">
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

          <Field label="Telefone" required>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400/40"
              placeholder="11999999999"
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

          <Field
            label="Meta tag de verificação"
            required={false}
            hint='Opcional. Crie o site sem a meta tag. Depois, volte em "Editar" e cole.'
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

          <Field label="Quem somos (Sobre nós)" required>
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
