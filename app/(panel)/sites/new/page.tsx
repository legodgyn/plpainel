"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

// =====================
// Helpers
// =====================
function onlyDigits(v: string) {
  return String(v || "").replace(/\D/g, "");
}

function formatCNPJ(input: string) {
  const digits = onlyDigits(input).slice(0, 14);
  if (!digits) return "";

  const p1 = digits.slice(0, 2);
  const p2 = digits.slice(2, 5);
  const p3 = digits.slice(5, 8);
  const p4 = digits.slice(8, 12);
  const p5 = digits.slice(12, 14);

  let out = p1;
  if (digits.length >= 3) out += `.${p2}`;
  if (digits.length >= 6) out += `.${p3}`;
  if (digits.length >= 9) out += `/${p4}`;
  if (digits.length >= 13) out += `-${p5}`;

  return out;
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

  if (digits.length >= 11) {
    const r = digits.slice(2, 11);
    const p1 = r.slice(0, 5);
    const p2 = r.slice(5, 9);
    return `(${ddd}) ${p1}-${p2}`;
  }

  return `(${ddd}) ${rest}`;
}

function slugify(input: string) {
  return String(input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildEmailFromCompany(name: string) {
  const cleaned = String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(ltda|me|epp|s\/a|sa|eireli)\b/gi, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, "");

  return `contato@${cleaned || "empresa"}.com`;
}

function parseMetaTag(input: string) {
  const raw = String(input || "").trim();
  if (!raw) return { name: null as string | null, content: null as string | null };

  if (!raw.toLowerCase().includes("<meta")) {
    return { name: "facebook-domain-verification", content: raw };
  }

  const nameMatch = raw.match(/name\s*=\s*["']([^"']+)["']/i);
  const contentMatch = raw.match(/content\s*=\s*["']([^"']+)["']/i);

  const name = nameMatch?.[1] ?? null;
  const content = contentMatch?.[1] ?? null;

  if (!name && content) {
    return { name: "facebook-domain-verification", content };
  }

  return { name, content };
}

function fmtDateBR(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

function makeMission(company: string) {
  return `A missão da ${company} é desenvolver e executar estratégias eficientes, orientadas a resultados, que fortaleçam a presença de marcas, ampliem oportunidades de negócio e impulsionem o crescimento sustentável de nossos clientes.

Atuamos com foco em marketing direto, publicidade e consultoria estratégica, oferecendo soluções personalizadas, baseadas em análise, criatividade, ética e comprometimento. Nosso propósito é gerar valor real por meio de campanhas bem estruturadas, comunicação assertiva e gestão responsável, sempre alinhados às necessidades e objetivos de cada cliente.`;
}

function makeAbout(opts: {
  razao: string;
  fantasia?: string | null;
  cnpj: string;
  abertura?: string | null;
  cidade?: string | null;
  uf?: string | null;
  porte?: string | null;
  natureza?: string | null;
  cnae?: string | null;
  endereco?: string | null;
}) {
  const { razao, fantasia, cnpj, abertura, cidade, uf, porte, natureza, cnae, endereco } = opts;

  return `QUEM SOMOS?

A ${razao}, registrada sob o CNPJ ${cnpj}${abertura ? `, foi fundada em ${fmtDateBR(abertura)}` : ""}${
    cidade || uf ? `, na cidade de ${cidade ?? "-"}${uf ? `, estado de ${uf}` : ""}` : ""
  }. ${porte ? `Somos uma ${porte.toLowerCase()}` : "Somos uma empresa"}${
    natureza ? `, com natureza jurídica ${natureza}` : ""
  }, atuando com foco em eficiência, organização e suporte empresarial.

${
  cnae
    ? `Nossa atividade principal, conforme a Receita Federal, inclui ${cnae}, que representa a base operacional de nossas atividades.`
    : `Nossa atuação é orientada por processos bem definidos e compromisso com resultados.`
}

${
  endereco
    ? `Localizada em ${endereco}, atuamos com atendimento próximo, responsável e alinhado às necessidades de cada cliente.`
    : `Atuamos com atendimento próximo, responsável e alinhado às necessidades de cada cliente.`
}

${fantasia ? `Nome Fantasia: ${fantasia}` : ""}

Na ${fantasia || razao}, acreditamos que resultados consistentes são alcançados por meio de organização, eficiência e relações transparentes. Nosso compromisso é atuar como uma extensão confiável da estrutura de nossos clientes.`;
}

function makePrivacy(opts: {
  razao: string;
  cnpj: string;
  endereco?: string | null;
  email: string;
  telefone?: string | null;
}) {
  const { razao, cnpj, endereco, email, telefone } = opts;

  return `POLÍTICA DE PRIVACIDADE

${razao}
CNPJ: ${cnpj}${endereco ? `\nEndereço: ${endereco}` : ""}

1. Finalidade

Esta Política de Privacidade descreve como a ${razao} coleta, utiliza, armazena e protege dados pessoais de clientes, parceiros, fornecedores e usuários que interagem conosco por meio de nossos canais de comunicação ou durante a contratação e execução de nossos serviços.

2. Dados Coletados

Coletamos apenas os dados necessários para as finalidades descritas nesta política, incluindo:
- Nome, e-mail, telefone, dados profissionais e informações empresariais (CPF ou CNPJ), quando necessário;
- Registros de comunicação, contratos, propostas e histórico de atendimento;
- Dados de navegação (quando aplicável), conforme políticas das plataformas utilizadas.

3. Uso dos Dados

Os dados pessoais coletados são utilizados para:
- Prestação e gestão dos serviços contratados;
- Comunicação operacional, administrativa e contratual;
- Cumprimento de obrigações legais e regulatórias;
- Melhoria contínua dos serviços e processos internos.

4. Compartilhamento de Dados

Não comercializamos dados pessoais. O compartilhamento ocorre apenas:
- Com parceiros essenciais à execução dos serviços, mediante confidencialidade;
- Quando exigido por lei, ordem judicial ou autoridade competente.

5. Direitos do Titular (LGPD)

Nos termos da LGPD (Lei nº 13.709/2018), o titular pode solicitar:
- Confirmação de tratamento, acesso, correção/atualização;
- Anonimização, bloqueio ou eliminação de dados excessivos;
- Portabilidade (quando aplicável) e revogação de consentimentos.

6. Armazenamento e Segurança

Adotamos medidas técnicas e administrativas adequadas para proteger os dados pessoais contra acessos não autorizados, perdas ou divulgações indevidas.

7. Alterações

Esta política pode ser atualizada periodicamente.

8. Contato

📧 E-mail: ${email}${telefone ? `\n📞 Telefone: ${telefone}` : ""}

${razao}
CNPJ ${cnpj}
©️ ${new Date().getFullYear()} ${razao}. Todos os direitos reservados.`;
}

function makeFooter(opts: {
  razao: string;
  cnpj: string;
  abertura?: string | null;
  porte?: string | null;
  natureza?: string | null;
  situacao?: string | null;
  tipo?: string | null;
  capital?: string | null;
  endereco?: string | null;
  cep?: string | null;
  email?: string | null;
  telefone?: string | null;
}) {
  const { razao, cnpj, abertura, porte, natureza, situacao, tipo, capital, endereco, cep, email, telefone } =
    opts;

  return `${razao} CNPJ: ${cnpj} | Data de Abertura: ${abertura ? fmtDateBR(abertura) : "-"} | Porte: ${
    porte || "-"
  } | Natureza Jurídica: ${natureza || "-"} | Situação Cadastral: ${situacao || "-"} | Tipo: ${
    tipo || "-"
  } | Capital Social: ${capital || "-"} | Endereço: ${endereco || "-"} | CEP: ${cep || "-"} | Contato: 📧 ${
    email || "-"
  } 📞 ${telefone || "-"} | ©️ ${new Date().getFullYear()} ${razao}. Todos os direitos reservados.`;
}

// =====================
// Page
// =====================
type BalanceRow = { balance: number | null };

type FormState = {
  slug: string;
  cnpj: string;
  company_name: string;
  fantasy_name: string;
  phone: string;
  whatsapp: string;
  email: string;
  instagram: string;
  facebook: string;
  meta_tag: string;
  about: string;
  mission: string;
  privacy: string;
  footer: string;
  is_public: boolean;
  opened_at: string | null;
  address_full: string;
  cep: string;
  city: string;
  uf: string;
  porte: string;
  natureza: string;
  situacao: string;
  tipo: string;
  capital: string;
  cnae_principal: string;
};

const initialForm: FormState = {
  slug: "",
  cnpj: "",
  company_name: "",
  fantasy_name: "",
  phone: "",
  whatsapp: "",
  email: "",
  instagram: "https://instagram.com",
  facebook: "https://facebook.com",
  meta_tag: "",
  about: "",
  mission: "",
  privacy: "",
  footer: "",
  is_public: true,
  opened_at: null,
  address_full: "",
  cep: "",
  city: "",
  uf: "",
  porte: "",
  natureza: "",
  situacao: "",
  tipo: "",
  capital: "",
  cnae_principal: "",
};

export default function NewSitePage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [insufficientTokens, setInsufficientTokens] = useState(false);

  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function loadBalance() {
      setBalanceLoading(true);
      const { data: auth, error: authErr } = await supabase.auth.getUser();
      const user = auth?.user;

      if (!alive) return;

      if (!user || authErr) {
        setBalance(null);
        setBalanceLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_token_balances")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle<BalanceRow>();

      if (!alive) return;

      if (error) setBalance(0);
      else setBalance(data?.balance ?? 0);

      setBalanceLoading(false);
    }

    loadBalance();
    return () => {
      alive = false;
    };
  }, []);

  async function generateFromCnpj() {
    setMsg(null);
    setInsufficientTokens(false);

    const cnpjDigits = onlyDigits(form.cnpj);
    if (!cnpjDigits || cnpjDigits.length < 14) {
      setMsg("Digite um CNPJ válido.");
      return;
    }

    setGenLoading(true);
    try {
      const res = await fetch(
        `https://back.blackflow.site/consultar-cnpj?cnpj=${cnpjDigits}&token=zjgw7hzv2bodmulxp0f82l`
      );

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Erro ao consultar CNPJ (${res.status}): ${txt}`);
      }

      const data: any = await res.json();

      const razao: string = data.razao_social || "";
      const fantasia: string = data.nome_fantasia || "";
      const abertura: string | null = data.data_abertura || data.data_situacao_cadastral || null;

      // endereco pode ser objeto aninhado ou campos na raiz
      const end = data.endereco || {};
      const logradouro = end.logradouro || data.logradouro || "";
      const numero = end.numero || data.numero || "";
      const complemento = end.complemento || data.complemento || "";
      const bairro = end.bairro || data.bairro || "";
      const municipio = (end.municipio?.nome || end.municipio) || data.municipio || "";
      const uf = end.uf || data.uf || "";
      const cep = end.cep || data.cep || "";

      const enderecoFull = [
        logradouro,
        numero ? `, ${numero}` : "",
        complemento ? `, ${complemento}` : "",
        bairro ? ` - ${bairro}` : "",
        municipio ? `, ${municipio}` : "",
        uf ? ` - ${uf}` : "",
        cep ? `, CEP ${cep}` : "",
      ]
        .join("")
        .replace(/\s+,/g, ",")
        .replace(/,\s+,/g, ",")
        .trim();

      const phone = formatBRPhone(String(data.telefone || "").trim());
      const nextSlugBase = fantasia || razao || form.slug || "meu-site";
      const nextSlug = slugify(nextSlugBase);
      const email = data.email || buildEmailFromCompany(razao || fantasia || nextSlugBase);

      const porte = data.porte || "";
      const natureza = (typeof data.natureza_juridica === "object" ? data.natureza_juridica?.descricao : data.natureza_juridica) || "";
      const situacao = data.situacao_cadastral || "";
      const tipo = data.tipo || "";
      const capital = data.capital_social || "";

      const cnaePrincipal = (typeof data.cnae_fiscal === "object" ? data.cnae_fiscal?.descricao : data.cnae_fiscal) || "";

      const mission = makeMission(razao || fantasia || "nossa empresa");
      const about = makeAbout({
        razao: razao || fantasia || "Empresa",
        fantasia: fantasia || null,
        cnpj: formatCNPJ(String(data.cnpj || cnpjDigits)),
        abertura,
        cidade: municipio || null,
        uf: uf || null,
        porte: porte || null,
        natureza: natureza || null,
        cnae: cnaePrincipal || null,
        endereco: enderecoFull || null,
      });

      const privacy = makePrivacy({
        razao: razao || fantasia || "Empresa",
        cnpj: formatCNPJ(String(data.cnpj || cnpjDigits)),
        endereco: enderecoFull || null,
        email,
        telefone: phone || null,
      });

      const footer = makeFooter({
        razao: razao || fantasia || "Empresa",
        cnpj: formatCNPJ(String(data.cnpj || cnpjDigits)),
        abertura,
        porte: porte || null,
        natureza: natureza || null,
        situacao: situacao || null,
        tipo: tipo || null,
        capital: capital || null,
        endereco: enderecoFull || null,
        cep: cep || null,
        email,
        telefone: phone || null,
      });

      setForm((prev) => ({
        ...prev,
        cnpj: formatCNPJ(String(data.cnpj || prev.cnpj)),
        company_name: razao || prev.company_name,
        fantasy_name: fantasia || prev.fantasy_name,
        slug: nextSlug || prev.slug,
        phone: phone || prev.phone,
        whatsapp: phone || prev.whatsapp,
        email: email || prev.email,
        instagram: prev.instagram || "https://instagram.com",
        facebook: prev.facebook || "https://facebook.com",
        mission,
        about,
        privacy,
        footer,
        opened_at: abertura,
        address_full: enderecoFull,
        cep,
        city: municipio,
        uf,
        porte,
        natureza,
        situacao,
        tipo,
        capital,
        cnae_principal: cnaePrincipal,
      }));
    } catch (e: any) {
      setMsg(e?.message || "Erro ao gerar dados do CNPJ.");
    } finally {
      setGenLoading(false);
    }
  }

  async function handleCreate() {
    setMsg(null);
    setInsufficientTokens(false);

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user || authErr) {
      setMsg("Você precisa estar logado para criar um site.");
      router.push("/login");
      return;
    }

    const slug = slugify(form.slug);
    if (!slug) return setMsg("Informe um slug válido.");

    const cnpjDigits = onlyDigits(form.cnpj);
    if (!cnpjDigits || cnpjDigits.length < 14) return setMsg("Informe um CNPJ válido.");
    if (!form.company_name.trim()) return setMsg("Razão Social é obrigatória.");

    setLoading(true);

    try {
      const { name: meta_verify_name, content: meta_verify_content } = parseMetaTag(form.meta_tag);

      const phoneFmt = formatBRPhone(form.phone);
      const whatsappFmt = formatBRPhone(form.whatsapp);

      const { data, error } = await supabase.rpc("create_site_with_token", {
        p_slug: slug,
        p_company_name: form.company_name.trim(),
        p_cnpj: cnpjDigits,
        p_phone: phoneFmt || null,
        p_email: form.email.trim() || null,
        p_instagram: form.instagram.trim() || null,
        p_whatsapp: whatsappFmt || null,
        p_mission: form.mission.trim() || null,
        p_about: form.about.trim() || null,
        p_privacy: form.privacy.trim() || null,
        p_footer: form.footer.trim() || null,
        p_meta_verify_name: meta_verify_name,
        p_meta_verify_content: meta_verify_content,
      });

      if (error) {
        if (
          error.message === "insufficient_tokens" ||
          error.message === "not_enough_tokens"
        ) {
          setInsufficientTokens(true);
          setMsg("Você não possui tokens suficientes para criar um site.");
        } else {
          setMsg(error.message || "Erro ao criar site.");
        }
        return;
      }

      setBalance((prev) => (typeof prev === "number" ? Math.max(0, prev - 1) : prev));
      router.push("/sites");
    } catch (e: any) {
      const message = e?.message || "Erro ao criar site.";

      if (message === "insufficient_tokens" || message === "not_enough_tokens") {
        setInsufficientTokens(true);
        setMsg("Você não possui tokens suficientes para criar um site.");
      } else {
        setMsg(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Criar Site</h1>
          <p className="mt-1 text-sm text-white/60">
            Preencha manualmente ou use <b>Gerar dados</b> para autopreencher via CNPJ.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
          <div className="text-white/70">Tokens</div>
          <div className="text-lg font-bold">{balanceLoading ? "—" : balance ?? 0}</div>
        </div>
      </div>

      {msg && !insufficientTokens && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {msg}
        </div>
      )}

      {insufficientTokens && (
        <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-200">
          <div className="font-semibold">Você não possui tokens suficientes para criar um site.</div>
          <div className="mt-1 text-amber-100/80">
            Cada site criado consome 1 token. Compre mais tokens para continuar.
          </div>

          <div className="mt-4">
            <button
              onClick={() => router.push("/tokens")}
              className="rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white transition hover:bg-violet-500"
            >
              Comprar Tokens
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="grid gap-3 md:grid-cols-3 md:items-end">
            <div className="md:col-span-2">
              <label className="text-xs text-white/70">CNPJ *</label>
              <input
                value={form.cnpj}
                onChange={(e) => setForm((p) => ({ ...p, cnpj: formatCNPJ(e.target.value) }))}
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-white outline-none focus:border-violet-400"
              />
            </div>

            <button
              onClick={generateFromCnpj}
              disabled={genLoading}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold hover:bg-violet-500 disabled:opacity-60"
            >
              {genLoading ? "Gerando..." : "Gerar dados"}
            </button>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs text-white/70">Razão Social *</label>
              <input
                value={form.company_name}
                onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-violet-400"
              />
            </div>

            <div>
              <label className="text-xs text-white/70">Nome Fantasia</label>
              <input
                value={form.fantasy_name}
                onChange={(e) => setForm((p) => ({ ...p, fantasy_name: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-violet-400"
              />
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs text-white/70">Domínio *</label>
              <input
                value={form.slug}
                onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                placeholder="movy-digital"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-violet-400"
              />
              <div className="mt-1 text-[11px] text-white/50">
                URL: https://<b>{slugify(form.slug) || "slug"}</b>.plpainel.com
              </div>
            </div>

            <div>
              <label className="text-xs text-white/70">Telefone</label>
              <input
                value={form.phone}
                onChange={(e) => {
                  const v = formatBRPhone(e.target.value);
                  setForm((p) => ({
                    ...p,
                    phone: v,
                    whatsapp: p.whatsapp ? p.whatsapp : v,
                  }));
                }}
                placeholder="(11) 99999-9999"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-violet-400"
              />
            </div>

            <div>
              <label className="text-xs text-white/70">WhatsApp</label>
              <input
                value={form.whatsapp}
                onChange={(e) => setForm((p) => ({ ...p, whatsapp: formatBRPhone(e.target.value) }))}
                placeholder="(11) 99999-9999"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-violet-400"
              />
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="md:col-span-1">
              <label className="text-xs text-white/70">E-mail</label>
              <input
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="contato@empresa.com"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-violet-400"
              />
            </div>

            <div>
              <label className="text-xs text-white/70">Instagram</label>
              <input
                value={form.instagram}
                onChange={(e) => setForm((p) => ({ ...p, instagram: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-violet-400"
              />
            </div>

            <div>
              <label className="text-xs text-white/70">Facebook</label>
              <input
                value={form.facebook}
                onChange={(e) => setForm((p) => ({ ...p, facebook: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-violet-400"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <input
              id="is_public"
              type="checkbox"
              checked={form.is_public}
              onChange={(e) => setForm((p) => ({ ...p, is_public: e.target.checked }))}
              className="h-4 w-4"
            />
            <label htmlFor="is_public" className="text-sm text-white/80">
              Deixar site público
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold">Meta tag de verificação</div>
          <div className="mt-1 text-xs text-white/60">
            Cole aqui a <b>meta tag completa</b> (VOCÊ SO VAI PREENCHER AQUI APOS CRIAR O DOMINIO NA BM,
            PEGUE A META TAG E COLE AQUI E SALVE NOVAMENTE).
          </div>
          <textarea
            value={form.meta_tag}
            onChange={(e) => setForm((p) => ({ ...p, meta_tag: e.target.value }))}
            rows={3}
            className="mt-3 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-white outline-none focus:border-violet-400"
            placeholder='Ex: <meta name="facebook-domain-verification" content="xxxxx" />  ou apenas xxxxx'
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm font-semibold">Nossa missão</div>
              <textarea
                value={form.mission}
                onChange={(e) => setForm((p) => ({ ...p, mission: e.target.value }))}
                rows={8}
                className="mt-3 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-violet-400"
              />
            </div>

            <div>
              <div className="text-sm font-semibold">Sobre nós</div>
              <textarea
                value={form.about}
                onChange={(e) => setForm((p) => ({ ...p, about: e.target.value }))}
                rows={8}
                className="mt-3 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-violet-400"
              />
            </div>

            <div>
              <div className="text-sm font-semibold">Política de privacidade</div>
              <textarea
                value={form.privacy}
                onChange={(e) => setForm((p) => ({ ...p, privacy: e.target.value }))}
                rows={8}
                className="mt-3 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-violet-400"
              />
            </div>

            <div>
              <div className="text-sm font-semibold">Rodapé</div>
              <textarea
                value={form.footer}
                onChange={(e) => setForm((p) => ({ ...p, footer: e.target.value }))}
                rows={8}
                className="mt-3 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-violet-400"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => router.push("/sites")}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
          >
            Cancelar
          </button>

          <button
            onClick={handleCreate}
            disabled={loading}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-60"
          >
            {loading ? "Criando..." : "Criar site"}
          </button>
        </div>
      </div>
    </div>
  );
}
