"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { makeCompanyAbout, makeCompanyMission } from "@/lib/companyTexts";

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
type TemplateType =
  | "professional_green"
  | "clean_institutional"
  | "commercial_landing"
  | "classic_simple";

const templateOptions: Array<{
  value: TemplateType;
  title: string;
  description: string;
  recommended?: boolean;
}> = [
  {
    value: "professional_green",
    title: "Profissional Verde",
    description: "Visual moderno com hero forte, seções institucionais e WhatsApp em destaque.",
    recommended: true,
  },
  {
    value: "clean_institutional",
    title: "Institucional Limpo",
    description: "Mais claro e direto, bom para empresas de serviço que querem leitura rápida.",
  },
  {
    value: "commercial_landing",
    title: "Landing Comercial",
    description: "Focado em conversão, chamada para contato e prova social logo no início.",
  },
  {
    value: "classic_simple",
    title: "Clássico Simples",
    description: "Mantém uma estrutura básica para quem prefere um site mais enxuto.",
  },
];

const colorOptions = [
  { name: "Verde PL", value: "#00B884" },
  { name: "Escuro premium", value: "#10231C" },
  { name: "Azul confiança", value: "#0B68D8" },
  { name: "Dourado CTA", value: "#F3B23C" },
];

function getCreatedSiteId(data: unknown) {
  if (!data) return null;

  if (typeof data === "string") return data;

  if (Array.isArray(data)) {
    return getCreatedSiteId(data[0]);
  }

  if (typeof data === "object") {
    const row = data as { id?: unknown; site_id?: unknown };
    const id = row.id || row.site_id;
    return typeof id === "string" ? id : null;
  }

  return null;
}

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
  const [templateType, setTemplateType] = useState<TemplateType>("professional_green");
  const [themeColor, setThemeColor] = useState("#00B884");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

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
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjDigits}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Erro BrasilAPI (${res.status}): ${txt}`);
      }

      const data: any = await res.json();

      const razao: string = data.razao_social || data.razao || "";
      const fantasia: string = data.nome_fantasia || data.fantasia || "";
      const abertura: string | null = data.data_inicio_atividade || data.data_abertura || null;

      const logradouro = data.logradouro || "";
      const numero = data.numero || "";
      const complemento = data.complemento || "";
      const bairro = data.bairro || "";
      const municipio = data.municipio || data.cidade || "";
      const uf = data.uf || "";
      const cep = data.cep || "";

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

      const phoneRaw =
        data.ddd_telefone_1
          ? `${data.ddd_telefone_1}`
          : data.telefone
          ? `${data.telefone}`
          : data.ddd
          ? `${data.ddd}${data.telefone_1 || ""}`
          : "";

      const phone = formatBRPhone(String(phoneRaw || "").trim());
      const nextSlugBase = fantasia || razao || form.slug || "meu-site";
      const nextSlug = slugify(nextSlugBase);
      const email = buildEmailFromCompany(razao || fantasia || nextSlugBase);

      const porte = data.porte || "";
      const natureza = data.natureza_juridica || data.natureza || "";
      const situacao = data.descricao_situacao_cadastral || data.situacao_cadastral || "";
      const tipo = data.descricao_identificador_matriz_filial || data.tipo || "";
      const capital = data.capital_social || data.capital || "";

      const cnaePrincipal =
        data.cnae_fiscal_descricao || (data.cnae_fiscal ? `CNAE ${data.cnae_fiscal}` : "") || "";

      const companyTextInput = {
        legalName: razao || fantasia || "Empresa",
        fantasyName: fantasia || null,
        cnpj: formatCNPJ(String(data.cnpj || cnpjDigits)),
        openedAt: abertura,
        city: municipio || null,
        state: uf || null,
        size: porte || null,
        legalNature: natureza || null,
        mainActivity: cnaePrincipal || null,
        address: enderecoFull || null,
      };
      const mission = makeCompanyMission(companyTextInput);
      const about = makeCompanyAbout(companyTextInput);

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

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        setMsg("Site criado, mas nao foi possivel confirmar a sessao para publicar.");
        return;
      }

      const normalizeRes = await fetch("/api/sites/normalize-subdomain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          slug,
          siteId: getCreatedSiteId(data),
        }),
      });

      const normalizeJson = await normalizeRes.json().catch(() => ({}));

      if (!normalizeRes.ok || !normalizeJson?.ok) {
        setMsg(
          normalizeJson?.error ||
            "Site criado, mas nao foi possivel ajustar o dominio padrao."
        );
        return;
      }

      const createdSiteId = getCreatedSiteId(data) || normalizeJson?.siteId || null;
      if (createdSiteId) {
        let uploadedLogo: string | null = null;

        if (logoFile) {
          const ext = logoFile.name.split(".").pop() || "png";
          const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const filePath = `${user.id}/${fileName}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("site-assets")
            .upload(filePath, logoFile, { upsert: true });

          if (!uploadError && uploadData?.path) {
            const { data: publicUrlData } = supabase.storage
              .from("site-assets")
              .getPublicUrl(uploadData.path);
            uploadedLogo = publicUrlData.publicUrl;
          }
        }

        const updatePayload: Record<string, string | null> = {
          template_type: templateType,
          simple_title: form.fantasy_name || form.company_name.trim() || null,
        };

        if (uploadedLogo) {
          updatePayload.logo_url = uploadedLogo;
        }

        await supabase
          .from("sites")
          .update(updatePayload)
          .eq("id", createdSiteId)
          .eq("user_id", user.id);
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
    <main className="pl-page max-w-7xl space-y-6">
      <div className="pl-page-title">
        <div>
          <span className="pl-badge">Novo site</span>
          <h1>Criar Site</h1>
          <p>
            Preencha manualmente ou use <b>Gerar dados</b> para autopreencher via CNPJ.
          </p>
        </div>

        <div className="pl-card-soft min-w-[140px] px-4 py-3">
          <div className="text-xs font-bold text-slate-500">Tokens</div>
          <div className="text-2xl font-black text-slate-950">{balanceLoading ? "-" : balance ?? 0}</div>
        </div>
      </div>

      {msg && !insufficientTokens && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {msg}
        </div>
      )}

      {insufficientTokens && (
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
          <div className="font-semibold">Você não possui tokens suficientes para criar um site.</div>
          <div className="mt-1 text-amber-100/80">
            Cada site criado consome 1 token. Compre mais tokens para continuar.
          </div>

          <div className="mt-4">
            <button
              onClick={() => router.push("/tokens")}
              className="pl-btn pl-btn-primary"
            >
              Comprar Tokens
            </button>
          </div>
        </div>
      )}

      <div className="space-y-5">
        <div className="pl-card">
          <div className="grid gap-3 md:grid-cols-3 md:items-end">
            <div className="md:col-span-2">
              <label className="pl-label">CNPJ *</label>
              <input
                value={form.cnpj}
                onChange={(e) => setForm((p) => ({ ...p, cnpj: formatCNPJ(e.target.value) }))}
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
                className="pl-input mt-2"
              />
            </div>

            <button
              onClick={generateFromCnpj}
              disabled={genLoading}
              className="pl-btn pl-btn-primary justify-center"
            >
              {genLoading ? "Gerando..." : "Gerar dados"}
            </button>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <label className="pl-label">Razao Social *</label>
              <input
                value={form.company_name}
                onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))}
                className="pl-input mt-2"
              />
            </div>

            <div>
              <label className="pl-label">Nome Fantasia</label>
              <input
                value={form.fantasy_name}
                onChange={(e) => setForm((p) => ({ ...p, fantasy_name: e.target.value }))}
                className="pl-input mt-2"
              />
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div>
              <label className="pl-label">Dominio *</label>
              <input
                value={form.slug}
                onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                placeholder="movy-digital"
                className="pl-input mt-2"
              />
              <div className="mt-2 text-xs font-semibold text-slate-500">
                URL: https://<b>{slugify(form.slug) || "slug"}</b>.[domínio disponível]
              </div>
            </div>

            <div>
              <label className="pl-label">Telefone</label>
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
                className="pl-input mt-2"
              />
            </div>

            <div>
              <label className="pl-label">WhatsApp</label>
              <input
                value={form.whatsapp}
                onChange={(e) => setForm((p) => ({ ...p, whatsapp: formatBRPhone(e.target.value) }))}
                placeholder="(11) 99999-9999"
                className="pl-input mt-2"
              />
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="md:col-span-1">
              <label className="pl-label">E-mail</label>
              <input
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="contato@empresa.com"
                className="pl-input mt-2"
              />
            </div>

            <div>
              <label className="pl-label">Instagram</label>
              <input
                value={form.instagram}
                onChange={(e) => setForm((p) => ({ ...p, instagram: e.target.value }))}
                className="pl-input mt-2"
              />
            </div>

            <div>
              <label className="pl-label">Facebook</label>
              <input
                value={form.facebook}
                onChange={(e) => setForm((p) => ({ ...p, facebook: e.target.value }))}
                className="pl-input mt-2"
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
            <label htmlFor="is_public" className="text-sm font-semibold text-slate-600">
              Deixar site público
            </label>
          </div>
        </div>

        <div className="pl-card">
          <div className="text-sm font-black text-slate-950">Meta Tag</div>
          <div className="mt-1 text-xs font-semibold text-slate-500">
            Cole aqui a <b>meta tag completa</b> (voce so vai preencher aqui apos criar o dominio na BM,
            PEGUE A META TAG E COLE AQUI E SALVE NOVAMENTE).
          </div>
          <textarea
            value={form.meta_tag}
            onChange={(e) => setForm((p) => ({ ...p, meta_tag: e.target.value }))}
            rows={3}
            className="pl-textarea mt-3"
            placeholder='Ex: <meta name="facebook-domain-verification" content="xxxxx" />  ou apenas xxxxx'
          />
        </div>

        <div className="pl-card">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm font-black text-slate-950">Nossa missao</div>
              <textarea
                value={form.mission}
                onChange={(e) => setForm((p) => ({ ...p, mission: e.target.value }))}
                rows={8}
                className="pl-textarea mt-3"
              />
            </div>

            <div>
              <div className="text-sm font-black text-slate-950">Sobre nos</div>
              <textarea
                value={form.about}
                onChange={(e) => setForm((p) => ({ ...p, about: e.target.value }))}
                rows={8}
                className="pl-textarea mt-3"
              />
            </div>

            <div>
              <div className="text-sm font-black text-slate-950">Politica de privacidade</div>
              <textarea
                value={form.privacy}
                onChange={(e) => setForm((p) => ({ ...p, privacy: e.target.value }))}
                rows={8}
                className="pl-textarea mt-3"
              />
            </div>

            <div>
              <div className="text-sm font-black text-slate-950">Rodape</div>
              <textarea
                value={form.footer}
                onChange={(e) => setForm((p) => ({ ...p, footer: e.target.value }))}
                rows={8}
                className="pl-textarea mt-3"
              />
            </div>
          </div>
        </div>

        <div className="pl-card p-5 text-[var(--panel-ink)]">
          <div className="mb-4">
            <div className="text-sm font-black">Modelo do site</div>
            <div className="mt-1 text-xs text-[var(--panel-muted)]">
              Escolha o visual inicial. Depois você pode publicar direto ou editar o layout.
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {templateOptions.map((option) => {
              const active = templateType === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTemplateType(option.value)}
                  className={[
                    "rounded-2xl border p-4 text-left transition",
                    active
                      ? "border-emerald-300 bg-emerald-50 shadow-[0_18px_45px_rgba(0,184,132,.13)]"
                      : "border-[var(--panel-line)] bg-white hover:border-emerald-200",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-black">{option.title}</div>
                      <p className="mt-1 text-xs leading-5 text-[var(--panel-muted)]">
                        {option.description}
                      </p>
                    </div>
                    {option.recommended ? (
                      <span className="pl-badge pl-badge-ok">recomendado</span>
                    ) : null}
                  </div>
                  <div className="mt-4 grid grid-cols-[1.1fr_.9fr] gap-2">
                    <span className="h-14 rounded-xl bg-[#eaf4ef]" />
                    <span className="h-14 rounded-xl bg-[#d9f8ec]" />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="pl-label">Logomarca opcional</label>
              <label className="flex cursor-pointer flex-wrap items-center gap-3 rounded-2xl border border-[var(--panel-line)] bg-white p-4">
                <span className="pl-btn pl-btn-primary">Subir logomarca</span>
                <span className="text-sm text-[var(--panel-muted)]">
                  {logoFile?.name || "Se não enviar, o site usa o nome da empresa"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setLogoFile(file);
                    setLogoPreview(file ? URL.createObjectURL(file) : null);
                  }}
                />
              </label>
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Prévia da logomarca"
                  className="mt-3 h-16 max-w-[180px] rounded-xl object-contain"
                />
              ) : null}
            </div>

            <div>
              <label className="pl-label">Cores do site</label>
              <div className="grid grid-cols-2 gap-3">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setThemeColor(color.value)}
                    className={[
                      "rounded-2xl border bg-white p-3 text-left transition",
                      themeColor === color.value
                        ? "border-emerald-300 shadow-[0_12px_30px_rgba(0,184,132,.12)]"
                        : "border-[var(--panel-line)]",
                    ].join(" ")}
                  >
                    <span
                      className="block h-10 rounded-xl"
                      style={{ background: color.value }}
                    />
                    <span className="mt-2 block text-xs font-black">{color.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => router.push("/sites")}
            className="pl-btn"
          >
            Cancelar
          </button>

          <button
            onClick={handleCreate}
            disabled={loading}
            className="pl-btn pl-btn-primary"
          >
            {loading ? "Criando..." : "Publicar agora"}
          </button>
        </div>
      </div>
    </main>
  );
}
