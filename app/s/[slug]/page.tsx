import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { slug: string } | Promise<{ slug: string }>;
};

const ROOT_DOMAINS = [
  "workersdevelopers.com.br",
  "bmworkers.com.br",
  "workersdev.com.br",
  "plpainel.com",
  "acmpainel.com.br",
  "ehspainel.com.br",
  "lcppainel.com.br",
  "lcspainel.com.br",
  "mapspainel.com.br",
  "fusionmix.com.br",
  "atronix.com.br",
  "lumixx.com.br",
  "witchdoctor.com.br",
  "drowranger.com.br",
  "avryxon.com.br",
  "zylaris.com.br",
  "zytrenko.com.br",
  "novoryn.com.br",
  "voryxel.com.br",
  "mavoryx.com.br",
  "monstergyn.com.br",
  "stormgyn.com.br",
  "stronggyn.com.br",
  "123hexa.com.br",
  "brhexa.com.br",
  "h3xa.com.br",
  "pl01.com.br",
  "pl02.com.br",
  "pl03.com.br",
  "lcp1.com.br",
  "lcp2.com.br",
  "lcp3.com.br",
  "lcp4.com.br",
  "lcp5.com.br",
  "lcp6.com.br",
  "lcp7.com.br",
  "lcp8.com.br",
  "lcp9.com.br",
];

function onlyDigits(v: string) {
  return String(v || "").replace(/\D/g, "");
}

function normalizeInstagram(v?: string | null) {
  const raw = String(v || "").trim();
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  const handle = raw.replace(/^@/, "").trim();
  return `https://instagram.com/${handle}`;
}

function normalizeWhatsApp(v?: string | null) {
  const digits = onlyDigits(String(v || ""));
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

function waWithText(waUrl: string | null, text: string) {
  if (!waUrl) return null;
  return `${waUrl}?text=${encodeURIComponent(text)}`;
}

function firstText(...values: Array<unknown>) {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
}

function compactText(input?: string | null, maxLength = 160) {
  const text = String(input || "")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}...`;
}

function fmtDateBR(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    return new Date(raw).toLocaleDateString("pt-BR");
  } catch {
    return raw;
  }
}

function extractRegisteredAddress(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const raw = String(value || "").trim();
    if (!raw) continue;

    const match = raw.match(/endere[cç]o cadastral:\s*([^\n]+)/i);
    if (match?.[1]) return match[1].replace(/\.$/, "").trim();
  }

  return "";
}

function buildOrganizationJsonLd(input: {
  companyName: string;
  cnpj: string;
  description: string;
  displayDomain: string;
  phone: string;
  email: string;
  whatsapp: string;
  address: string;
  city: string;
  state: string;
  igUrl: string | null;
}) {
  const sameAs = [input.igUrl].filter(Boolean);
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: input.companyName,
    taxID: input.cnpj,
    url: `https://${input.displayDomain}`,
    description: input.description,
  };

  if (input.phone) jsonLd.telephone = input.phone;
  if (input.email) jsonLd.email = input.email;
  if (input.whatsapp) {
    jsonLd.contactPoint = [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        telephone: input.whatsapp,
      },
    ];
  }
  if (sameAs.length) jsonLd.sameAs = sameAs;
  if (input.address || input.city || input.state) {
    jsonLd.address = {
      "@type": "PostalAddress",
      streetAddress: input.address || undefined,
      addressLocality: input.city || undefined,
      addressRegion: input.state || undefined,
      addressCountry: "BR",
    };
  }

  return JSON.stringify(jsonLd).replace(/</g, "\\u003c");
}

const publicThemes = [
  {
    name: "verification_green",
    ink: "#10201c",
    muted: "#5f706b",
    line: "#d9e7e1",
    soft: "#f1faf6",
    heroA: "#08735f",
    heroB: "#11a37f",
    dark: "#0f2e29",
    accent: "#f5b84b",
  },
  {
    name: "verification_blue",
    ink: "#111f2d",
    muted: "#607083",
    line: "#d9e5ef",
    soft: "#eef7fb",
    heroA: "#174c66",
    heroB: "#2d8caf",
    dark: "#0d2938",
    accent: "#f0b64f",
  },
  {
    name: "verification_wine",
    ink: "#25151c",
    muted: "#735d66",
    line: "#eadbe1",
    soft: "#fff3f6",
    heroA: "#7a1f42",
    heroB: "#b93564",
    dark: "#351522",
    accent: "#f2bd5b",
  },
  {
    name: "verification_graphite",
    ink: "#171b20",
    muted: "#69717a",
    line: "#dde2e6",
    soft: "#f4f7f8",
    heroA: "#26323d",
    heroB: "#52616f",
    dark: "#111920",
    accent: "#d7b56d",
  },
  {
    name: "verification_gold",
    ink: "#211b10",
    muted: "#756a59",
    line: "#eadfca",
    soft: "#fff8ea",
    heroA: "#7b5315",
    heroB: "#c38a27",
    dark: "#2d210f",
    accent: "#2fb184",
  },
] as const;

function getPublicTheme(templateType: string, seed: string) {
  const found = publicThemes.find((theme) => theme.name === templateType);
  if (found) return found;

  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  return publicThemes[hash % publicThemes.length];
}

function makeWhoWeAreText(input: {
  companyName: string;
  cnpj: string;
  openedAt: string;
  city: string;
  uf: string;
  legalNature: string;
  porte: string;
}) {
  const location = [input.city, input.uf].filter(Boolean).join(" / ");
  return `${input.companyName}, registrada sob o CNPJ ${input.cnpj}${
    input.openedAt ? `, com inicio de atividades em ${fmtDateBR(input.openedAt)}` : ""
  }${location ? `, localizada em ${location}` : ""}. ${
    input.porte ? `Empresa de porte ${input.porte}` : "Empresa"
  }${input.legalNature ? `, constituida como ${input.legalNature}` : ""}, com atendimento profissional e canais oficiais de relacionamento.`;
}

function makeActivityText(companyName: string, officialActivity: string) {
  if (officialActivity) {
    return `Conforme cadastro publico, a atividade principal da ${companyName} esta relacionada a ${officialActivity}.`;
  }

  return `A ${companyName} atua com atendimento profissional, organizacao, suporte e relacionamento direto com clientes e parceiros.`;
}

function makeCommitmentText(companyName: string, city: string, uf: string) {
  const location = [city, uf].filter(Boolean).join(" / ");
  return `A ${companyName} mantem compromisso com atendimento claro, privacidade das informacoes recebidas e transparencia nas relacoes com clientes${
    location ? ` em ${location} e regiao` : ""
  }.`;
}

function extractMetaContent(input?: string | null) {
  const raw = String(input || "").trim();
  if (!raw) return null;

  const match = raw.match(/content\s*=\s*["']([^"']+)["']/i);
  if (match?.[1]) return match[1].trim();

  return raw;
}

function extractMetaName(input?: string | null) {
  const raw = String(input || "").trim();
  if (!raw) return null;

  const match = raw.match(/name\s*=\s*["']([^"']+)["']/i);
  if (match?.[1]) return match[1].trim();

  return raw;
}

function getCleanHost(host: string) {
  return String(host || "").split(":")[0].trim().toLowerCase();
}

function getBaseDomainFromHost(host: string) {
  const cleanHost = getCleanHost(host);

  for (const rootDomain of ROOT_DOMAINS) {
    if (cleanHost === rootDomain || cleanHost === `www.${rootDomain}`) {
      return rootDomain;
    }

    if (cleanHost.endsWith(`.${rootDomain}`)) {
      return rootDomain;
    }
  }

  return null;
}

function extractSlugFromHost(host: string, baseDomain: string | null) {
  if (!baseDomain) return null;

  const cleanHost = getCleanHost(host);

  if (cleanHost === baseDomain || cleanHost === `www.${baseDomain}`) {
    return null;
  }

  if (!cleanHost.endsWith(`.${baseDomain}`)) {
    return null;
  }

  const withoutBase = cleanHost.slice(0, -(`.${baseDomain}`.length));
  if (!withoutBase) return null;

  const parts = withoutBase.split(".").filter(Boolean);
  if (parts.length === 0) return null;

  return parts[parts.length - 1] || null;
}

async function resolveSiteContext(props: PageProps) {
  const headerList = await headers();
  const host = headerList.get("host") || "";
  const hostBaseDomain = getBaseDomainFromHost(host);

  const params = await Promise.resolve(props.params);
  const routeSlug = String(params?.slug || "").trim() || null;
  const hostSlug = extractSlugFromHost(host, hostBaseDomain);

  const slug = hostSlug || routeSlug;

  return {
    host,
    hostBaseDomain,
    routeSlug,
    hostSlug,
    slug,
    isSubdomainAccess: Boolean(hostSlug),
  };
}

async function findSite(slug: string, hostBaseDomain: string | null) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  if (slug.includes(".")) {
    const cleanFullDomain = slug.toLowerCase();
    const domainCandidates = cleanFullDomain.startsWith("www.")
      ? [cleanFullDomain, cleanFullDomain.slice(4)]
      : [cleanFullDomain, `www.${cleanFullDomain}`];

    for (const domainCandidate of domainCandidates) {
      const { data } = await supabase
        .from("sites")
        .select("*")
        .eq("custom_domain", domainCandidate)
        .eq("is_public", true)
        .maybeSingle();

      if (data) return data;
    }

    const [hostSlug, ...baseParts] = cleanFullDomain.split(".").filter(Boolean);
    const baseDomain = baseParts.join(".");

    if (hostSlug && baseDomain) {
      const { data: subdomainSite } = await supabase
        .from("sites")
        .select("*")
        .eq("slug", hostSlug)
        .eq("base_domain", baseDomain)
        .eq("is_public", true)
        .maybeSingle();

      if (subdomainSite) return subdomainSite;
    }
  }

  if (hostBaseDomain) {
    const { data } = await supabase
      .from("sites")
      .select("*")
      .eq("slug", slug)
      .eq("is_public", true)
      .eq("base_domain", hostBaseDomain)
      .maybeSingle();

    if (data) return data;
  }

  const { data } = await supabase
    .from("sites")
    .select("*")
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();

  return data ?? null;
}

function FallbackPage() {
  return (
    <main className="min-h-screen bg-[#F5F0FA] text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-20">
        <div className="rounded-2xl border border-purple-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">Site em configuração</h1>
          <p className="mt-3 text-sm text-slate-600">
            Esta página ainda está sendo configurada. Tente novamente em alguns
            minutos.
          </p>
        </div>
      </div>
    </main>
  );
}

function PublicCriticalCss() {
  return (
    <style>{`
      .public-site {
        min-height: 100vh;
        background: #f5f0fa;
        color: #0f172a;
        font-family: Arial, Helvetica, sans-serif;
      }
      .public-site * { box-sizing: border-box; }
      .public-site a { color: inherit; }
      .public-site .mx-auto { margin-left: auto; margin-right: auto; }
      .public-site .max-w-5xl { max-width: 64rem; }
      .public-site .max-w-3xl { max-width: 48rem; }
      .public-site .min-h-screen { min-height: 100vh; }
      .public-site .flex { display: flex; }
      .public-site .grid { display: grid; }
      .public-site .block { display: block; }
      .public-site .inline-flex { display: inline-flex; }
      .public-site .hidden { display: none; }
      .public-site .flex-col { flex-direction: column; }
      .public-site .flex-wrap { flex-wrap: wrap; }
      .public-site .items-center { align-items: center; }
      .public-site .items-start { align-items: flex-start; }
      .public-site .justify-between { justify-content: space-between; }
      .public-site .justify-center { justify-content: center; }
      .public-site .place-items-center { place-items: center; }
      .public-site .text-center { text-align: center; }
      .public-site .text-left { text-align: left; }
      .public-site .text-right { text-align: right; }
      .public-site .whitespace-pre-line { white-space: pre-line; }
      .public-site .gap-3 { gap: .75rem; }
      .public-site .gap-6 { gap: 1.5rem; }
      .public-site .space-y-2 > * + * { margin-top: .5rem; }
      .public-site .space-y-6 > * + * { margin-top: 1.5rem; }
      .public-site .px-4 { padding-left: 1rem; padding-right: 1rem; }
      .public-site .px-5 { padding-left: 1.25rem; padding-right: 1.25rem; }
      .public-site .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
      .public-site .py-3 { padding-top: .75rem; padding-bottom: .75rem; }
      .public-site .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
      .public-site .py-10 { padding-top: 2.5rem; padding-bottom: 2.5rem; }
      .public-site .pt-10 { padding-top: 2.5rem; }
      .public-site .pb-8 { padding-bottom: 2rem; }
      .public-site .pb-14 { padding-bottom: 3.5rem; }
      .public-site .p-6 { padding: 1.5rem; }
      .public-site .p-7 { padding: 1.75rem; }
      .public-site .mt-2 { margin-top: .5rem; }
      .public-site .mt-3 { margin-top: .75rem; }
      .public-site .mt-4 { margin-top: 1rem; }
      .public-site .mt-5 { margin-top: 1.25rem; }
      .public-site .mt-6 { margin-top: 1.5rem; }
      .public-site .mt-7 { margin-top: 1.75rem; }
      .public-site .mt-8 { margin-top: 2rem; }
      .public-site .w-full { width: 100%; }
      .public-site .h-9 { height: 2.25rem; }
      .public-site .w-9 { width: 2.25rem; }
      .public-site .h-14 { height: 3.5rem; }
      .public-site .w-14 { width: 3.5rem; }
      .public-site .h-\\[180px\\] { height: 180px; }
      .public-site .w-\\[180px\\] { width: 180px; }
      .public-site .rounded-full { border-radius: 9999px; }
      .public-site .rounded-md { border-radius: .375rem; }
      .public-site .rounded-xl { border-radius: .75rem; }
      .public-site .rounded-2xl { border-radius: 1rem; }
      .public-site .border { border: 1px solid #e9d5ff; }
      .public-site .border-t { border-top: 1px solid #e9d5ff; }
      .public-site .border-b { border-bottom: 1px solid #e9d5ff; }
      .public-site .border-purple-200 { border-color: #e9d5ff; }
      .public-site .border-purple-300 { border-color: #d9b3ff; }
      .public-site .bg-white { background: #fff; }
      .public-site .bg-white\\/90 { background: rgba(255,255,255,.9); }
      .public-site .bg-purple-50 { background: #faf5ff; }
      .public-site .bg-purple-800 { background: #6e11b0; }
      .public-site .bg-slate-100 { background: #f1f5f9; }
      .public-site .text-white { color: #fff; }
      .public-site .text-slate-400 { color: #90a1b9; }
      .public-site .text-slate-500 { color: #62748e; }
      .public-site .text-slate-700 { color: #314158; }
      .public-site .text-slate-800 { color: #1d293d; }
      .public-site .text-slate-900 { color: #0f172b; }
      .public-site .text-purple-700 { color: #8200da; }
      .public-site .text-purple-900 { color: #59168b; }
      .public-site .shadow-sm { box-shadow: 0 1px 3px rgba(15,23,42,.08), 0 1px 2px rgba(15,23,42,.06); }
      .public-site .backdrop-blur { backdrop-filter: blur(8px); }
      .public-site .text-xs { font-size: .75rem; line-height: 1rem; }
      .public-site .text-sm { font-size: .875rem; line-height: 1.25rem; }
      .public-site .text-base { font-size: 1rem; line-height: 1.5rem; }
      .public-site .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
      .public-site .text-2xl { font-size: 1.5rem; line-height: 2rem; }
      .public-site .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
      .public-site .text-6xl { font-size: 3.75rem; line-height: 1; }
      .public-site .font-semibold { font-weight: 600; }
      .public-site .font-bold { font-weight: 700; }
      .public-site .font-extrabold { font-weight: 800; }
      .public-site .tracking-tight { letter-spacing: -.025em; }
      .public-site .tracking-widest { letter-spacing: .1em; }
      .public-site .leading-tight { line-height: 1.25; }
      .public-site .leading-relaxed { line-height: 1.625; }
      .public-site .opacity-70 { opacity: .7; }
      .public-site .cursor-not-allowed { cursor: not-allowed; }
      .public-site .hover\\:bg-purple-900:hover { background: #59168b; }
      .public-site .hover\\:bg-purple-100:hover { background: #f3e8ff; }
      .public-site .underline { text-decoration: underline; }
      .public-site .underline-offset-4 { text-underline-offset: 4px; }
      .public-site .pointer-events-none { pointer-events: none; }
      @media (min-width: 640px) {
        .public-site .sm\\:p-7 { padding: 1.75rem; }
        .public-site .sm\\:p-10 { padding: 2.5rem; }
        .public-site .sm\\:text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
        .public-site .sm\\:text-base { font-size: 1rem; line-height: 1.5rem; }
      }
      @media (min-width: 768px) {
        .public-site .md\\:grid-cols-\\[1\\.4fr_\\.6fr\\] { grid-template-columns: 1.4fr .6fr; }
      }
    `}</style>
  );
}

type ModernPublicSiteProps = {
  company_name: string;
  cnpj: string;
  mission: string;
  phone: string;
  email: string;
  whatsapp: string;
  about: string;
  privacy: string | null;
  footer: string;
  logo_url: string;
  displayDomain: string;
  officialActivity: string;
  registeredAddress: string;
  openedAt: string;
  city: string;
  uf: string;
  companyStatus: string;
  legalNature: string;
  porte: string;
  templateType: string;
  igUrl: string | null;
  waCta: string | null;
};

function ModernPublicSite({
  company_name,
  cnpj,
  mission,
  phone,
  email,
  whatsapp,
  about,
  privacy,
  footer,
  logo_url,
  displayDomain,
  officialActivity,
  registeredAddress,
  openedAt,
  city,
  uf,
  companyStatus,
  legalNature,
  porte,
  templateType,
  igUrl,
  waCta,
}: ModernPublicSiteProps) {
  const theme = getPublicTheme(templateType, displayDomain || company_name);
  const themeStyle = {
    "--public-ink": theme.ink,
    "--public-muted": theme.muted,
    "--public-line": theme.line,
    "--public-soft": theme.soft,
    "--public-hero-a": theme.heroA,
    "--public-hero-b": theme.heroB,
    "--public-dark": theme.dark,
    "--public-accent": theme.accent,
  } as CSSProperties;
  const description = compactText(
    mission || about || `${company_name} - pagina oficial com dados cadastrais, canais de contato e informacoes institucionais.`
  );
  const jsonLd = buildOrganizationJsonLd({
    companyName: company_name,
    cnpj,
    description,
    displayDomain,
    phone,
    email,
    whatsapp,
    address: registeredAddress,
    city,
    state: uf,
    igUrl,
  });
  const whoWeAreText = makeWhoWeAreText({ companyName: company_name, cnpj, openedAt, city, uf, legalNature, porte });
  const activityText = makeActivityText(company_name, officialActivity);
  const commitmentText = makeCommitmentText(company_name, city, uf);
  const fallbackFooter = `${company_name} CNPJ: ${cnpj} | ${displayDomain} | © ${new Date().getFullYear()} ${company_name}. Todos os direitos reservados.`;
  const privacyText = privacy || `Esta politica descreve como a ${company_name} trata informacoes enviadas voluntariamente por visitantes, clientes e interessados por meio dos canais oficiais de contato.\n\nPodemos receber nome, telefone, WhatsApp, email, mensagem enviada e outras informacoes fornecidas espontaneamente durante o atendimento.\n\nOs dados sao utilizados para responder solicitacoes, prestar atendimento, enviar retorno comercial, organizar contatos e cumprir obrigacoes legais quando aplicavel.\n\nAs informacoes nao sao vendidas. O titular pode solicitar informacoes, atualizacao, correcao ou exclusao de seus dados pelos canais oficiais exibidos nesta pagina.`;
  const termsText = `Esta pagina tem finalidade institucional, informativa e comercial. O visitante deve utilizar as informacoes e canais disponibilizados de forma licita, respeitosa e relacionada aos servicos, produtos, atendimento ou informacoes da empresa.\n\nA ${company_name} busca manter os dados cadastrais, canais de contato, descricoes e informacoes comerciais atualizados. Eventuais informacoes podem ser corrigidas, complementadas ou alteradas a qualquer momento.\n\nO contato por WhatsApp, telefone, email ou redes sociais deve ser usado para solicitacoes reais, atendimento comercial, suporte, duvidas ou continuidade de relacionamento iniciado pelo visitante.\n\nEsta pagina pode direcionar para ferramentas externas, como WhatsApp, Instagram, telefone e email. Cada plataforma pode possuir regras, politicas e condicoes proprias.`;

  return (
    <main className="min-h-screen bg-[#fbfdfc] text-[var(--public-ink)]" style={themeStyle}>
      <PublicCriticalCss />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <header className="sticky top-0 z-50 border-b border-[var(--public-line)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-[74px] w-full max-w-6xl flex-col gap-4 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <a href="#home" className="flex min-w-0 items-center gap-3">
            {logo_url ? <img src={logo_url} alt={company_name} className="h-12 w-12 rounded-lg object-contain" /> : <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[var(--public-hero-a)] to-[var(--public-hero-b)] text-lg font-black text-white shadow-[0_10px_20px_rgba(16,32,28,.18)]">{(company_name?.[0] || "E").toUpperCase()}</div>}
            <div className="min-w-0 leading-tight"><strong className="block truncate text-sm text-[var(--public-ink)]">{company_name}</strong><span className="mt-1 block truncate text-xs text-[var(--public-muted)]">Pagina oficial da empresa</span></div>
          </a>
          <nav className="flex flex-wrap items-center gap-2 sm:justify-end">
            <a href="#home" className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--public-muted)] hover:bg-[var(--public-soft)]">Home</a>
            <a href="#sobre" className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--public-muted)] hover:bg-[var(--public-soft)]">Sobre</a>
            <a href="#dados" className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--public-muted)] hover:bg-[var(--public-soft)]">Dados oficiais</a>
            <a href="#contato" className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--public-muted)] hover:bg-[var(--public-soft)]">Contato</a>
            {waCta ? <a href={waCta} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--public-hero-a)] px-4 text-sm font-extrabold text-white">Contato</a> : null}
          </nav>
        </div>
      </header>

      <section id="home" className="border-b border-[var(--public-line)] bg-[linear-gradient(115deg,var(--public-hero-a),var(--public-hero-b))] px-4 py-14 text-white">
        <div className="mx-auto max-w-6xl">
          <span className="inline-flex rounded-full border border-white/35 bg-white/15 px-3 py-2 text-xs font-black uppercase">Pagina oficial</span>
          <h1 className="mt-5 max-w-5xl text-3xl font-black leading-tight tracking-normal sm:text-5xl">{company_name}</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-white/90 sm:text-lg">{mission || "Atendimento profissional com informacoes claras, canais oficiais de contato e compromisso com privacidade e transparencia."}</p>
          <div className="mt-7 flex flex-wrap gap-3"><a href="#dados" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-5 text-sm font-extrabold text-[var(--public-hero-a)]">Ver dados oficiais</a>{waCta ? <a href={waCta} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/40 bg-white/10 px-5 text-sm font-extrabold text-white">Chamar no WhatsApp</a> : null}</div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-lg border border-white/25 bg-white/10 p-4"><small className="text-xs font-black uppercase text-white/70">CNPJ</small><b className="mt-1 block break-all text-sm">{cnpj}</b></div><div className="rounded-lg border border-white/25 bg-white/10 p-4"><small className="text-xs font-black uppercase text-white/70">Situacao</small><b className="mt-1 block text-sm">{companyStatus || "Ativa"}</b></div><div className="rounded-lg border border-white/25 bg-white/10 p-4"><small className="text-xs font-black uppercase text-white/70">Localidade</small><b className="mt-1 block text-sm">{[city, uf].filter(Boolean).join(" / ") || "-"}</b></div><div className="rounded-lg border border-white/25 bg-white/10 p-4"><small className="text-xs font-black uppercase text-white/70">Dominio</small><b className="mt-1 block break-all text-sm">{displayDomain}</b></div></div>
        </div>
      </section>

      <section className="px-4 py-10"><div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-3"><article id="sobre" className="rounded-lg border border-[var(--public-line)] bg-white p-5 shadow-[0_12px_28px_rgba(16,32,28,.08)]"><h3 className="text-lg font-black">Quem somos</h3><p className="mt-3 text-sm leading-7 text-[var(--public-muted)]">{whoWeAreText}</p></article><article className="rounded-lg border border-[var(--public-line)] bg-white p-5 shadow-[0_12px_28px_rgba(16,32,28,.08)]"><h3 className="text-lg font-black">Atividade principal</h3><p className="mt-3 text-sm leading-7 text-[var(--public-muted)]">{activityText}</p></article><article className="rounded-lg border border-[var(--public-line)] bg-white p-5 shadow-[0_12px_28px_rgba(16,32,28,.08)]"><h3 className="text-lg font-black">Compromisso</h3><p className="mt-3 text-sm leading-7 text-[var(--public-muted)]">{commitmentText}</p></article></div></section>

      <section id="dados" className="border-y border-[var(--public-line)] bg-[var(--public-soft)] px-4 py-10"><div className="mx-auto max-w-6xl"><h2 className="mb-4 text-2xl font-black">Dados oficiais</h2><div className="rounded-lg border border-[var(--public-line)] bg-white p-5 shadow-[0_8px_20px_rgba(16,32,28,.06)]"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div><small className="block text-xs font-black uppercase tracking-wide text-[var(--public-muted)]">Razao Social</small><div className="mt-2 text-sm font-black leading-5">{company_name}</div></div><div><small className="block text-xs font-black uppercase tracking-wide text-[var(--public-muted)]">CNPJ</small><div className="mt-2 text-sm font-black leading-5">{cnpj}</div></div><div><small className="block text-xs font-black uppercase tracking-wide text-[var(--public-muted)]">Dominio</small><div className="mt-2 break-all text-sm font-black leading-5">{displayDomain}</div></div><div><small className="block text-xs font-black uppercase tracking-wide text-[var(--public-muted)]">Atividade</small><div className="mt-2 text-sm font-black leading-5">{officialActivity || "Atendimento profissional"}</div></div></div><div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">{openedAt ? <div><small className="block text-xs font-black uppercase tracking-wide text-[var(--public-muted)]">Abertura</small><div className="mt-2 text-sm font-black leading-5">{fmtDateBR(openedAt)}</div></div> : null}{companyStatus ? <div><small className="block text-xs font-black uppercase tracking-wide text-[var(--public-muted)]">Situacao</small><div className="mt-2 text-sm font-black leading-5">{companyStatus}</div></div> : null}{legalNature ? <div><small className="block text-xs font-black uppercase tracking-wide text-[var(--public-muted)]">Natureza Juridica</small><div className="mt-2 text-sm font-black leading-5">{legalNature}</div></div> : null}{porte ? <div><small className="block text-xs font-black uppercase tracking-wide text-[var(--public-muted)]">Porte</small><div className="mt-2 text-sm font-black leading-5">{porte}</div></div> : null}{city || uf ? <div><small className="block text-xs font-black uppercase tracking-wide text-[var(--public-muted)]">Localidade</small><div className="mt-2 text-sm font-black leading-5">{[city, uf].filter(Boolean).join(" / ")}</div></div> : null}</div>{registeredAddress ? <div className="mt-5 rounded-lg border border-[var(--public-line)] bg-[var(--public-soft)] p-4"><small className="block text-xs font-black uppercase tracking-wide text-[var(--public-hero-a)]">Endereco cadastral</small><div className="mt-2 text-sm font-black leading-6 text-slate-900">{registeredAddress}</div></div> : null}</div></div></section>

      <section id="contato" className="bg-[var(--public-dark)] px-4 py-10 text-white"><div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2"><div><h2 className="text-2xl font-black">Canais oficiais de contato</h2><div className="mt-5 grid gap-3 text-sm font-bold">{whatsapp ? <div className="rounded-lg border border-white/15 bg-white/10 p-4">WhatsApp: {whatsapp}</div> : null}{phone ? <div className="rounded-lg border border-white/15 bg-white/10 p-4">Telefone: {phone}</div> : null}{email ? <div className="break-all rounded-lg border border-white/15 bg-white/10 p-4">Email: {email}</div> : null}{igUrl ? <a href={igUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-white/15 bg-white/10 p-4">Instagram</a> : null}</div></div><div className="rounded-lg border border-white/15 bg-white/10 p-5 text-sm leading-7 text-white/80"><b className="text-white">Atendimento oficial</b><br />Entre em contato pelos canais informados nesta pagina para solicitar informacoes, atendimento comercial, suporte ou retorno da equipe responsavel.</div></div></section>

      <footer className="bg-[#071b18] px-4 py-8 text-white/80"><div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-[1.5fr_.8fr]"><div><div className="mb-2 font-black text-white">{company_name}</div><div className="whitespace-pre-line text-sm leading-7 text-white/70">{footer || fallbackFooter}</div></div><div className="grid content-start gap-3 sm:justify-end"><a href="#privacy-modal" className="text-sm font-bold text-white/90">Politica de Privacidade</a><a href="#terms-modal" className="text-sm font-bold text-white/90">Termos de Uso</a><a href="#home" className="text-sm font-bold text-white/90">Voltar ao topo</a></div></div></footer>

      <div id="privacy-modal" className="invisible fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-5 opacity-0 transition target:visible target:opacity-100"><a href="#home" className="absolute inset-0" aria-label="Fechar politica de privacidade" /><div className="relative max-h-[82vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-7 shadow-[0_30px_60px_rgba(0,0,0,.25)]"><a href="#home" aria-label="Fechar" className="absolute right-4 top-3 text-2xl font-bold text-slate-500 hover:text-slate-900">×</a><h2 className="pr-8 text-2xl font-black text-slate-950">Politica de Privacidade</h2><p className="mt-4 whitespace-pre-line text-sm leading-8 text-slate-700">{privacyText}</p></div></div>
      <div id="terms-modal" className="invisible fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-5 opacity-0 transition target:visible target:opacity-100"><a href="#home" className="absolute inset-0" aria-label="Fechar termos de uso" /><div className="relative max-h-[82vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-7 shadow-[0_30px_60px_rgba(0,0,0,.25)]"><a href="#home" aria-label="Fechar" className="absolute right-4 top-3 text-2xl font-bold text-slate-500 hover:text-slate-900">×</a><h2 className="pr-8 text-2xl font-black text-slate-950">Termos de Uso</h2><p className="mt-4 whitespace-pre-line text-sm leading-8 text-slate-700">{termsText}</p></div></div>
    </main>
  );
}
export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug, host, hostBaseDomain } = await resolveSiteContext(props);

  if (!slug) {
    return { title: "Site público" };
  }

  const data = await findSite(slug, hostBaseDomain);
  const title = (data?.company_name as string | null) || "Site público";
  const description = compactText(
    ((data?.mission as string | null) || (data?.about as string | null) || "").trim() ||
      `${title} - pagina oficial com dados cadastrais e canais de contato.`
  );

  const cleanHost = getCleanHost(host);
  const publicUrl = `https://${cleanHost}/`;

  const metaName = extractMetaName((data?.meta_verify_name as string | null) ?? null);
  const metaContent = extractMetaContent(
    (data?.meta_verify_content as string | null) ?? null
  );

  return {
    title,
    description,
    alternates: {
      canonical: publicUrl,
    },
    openGraph: {
      url: publicUrl,
      title,
      description,
      type: "website",
    },
    verification:
      metaName && metaContent
        ? {
            other: {
              [metaName]: metaContent,
            },
          }
        : undefined,
  };
}

export default async function PublicSitePage(props: PageProps) {
  const { slug, hostBaseDomain } = await resolveSiteContext(props);

  if (!slug) {
    return <FallbackPage />;
  }

  const data = await findSite(slug, hostBaseDomain);

  if (!data) {
    return <FallbackPage />;
  }

  const company_name = (data.company_name as string | null) || "Empresa";
  const cnpj = (data.cnpj as string | null) || "—";
  const mission = (data.mission as string | null) || "";
  const phone = (data.phone as string | null) || "";
  const email = (data.email as string | null) || "";
  const instagram = (data.instagram as string | null) || null;
  const whatsapp = (data.whatsapp as string | null) || "";
  const about = (data.about as string | null) || "";
  const about_simple = (data.about_simple as string | null) || "";
  const logo_url = (data.logo_url as string | null) || "";
  const template_type = (data.template_type as string | null) || "default";
  const simple_title = (data.simple_title as string | null) || "";
  const privacy = (data.privacy as string | null) || null;
  const footer = (data.footer as string | null) || "—";
  const officialActivity =
    (data.cnae_principal as string | null) ||
    (data.natureza as string | null) ||
    "";
  const registeredAddress =
    firstText(data.address_full, data.endereco, data.address) ||
    extractRegisteredAddress(about, footer);
  const openedAt = firstText(data.opened_at, data.data_abertura, data.abertura);
  const city = firstText(data.city, data.municipio, data.cidade);
  const uf = firstText(data.uf, data.state);
  const companyStatus = firstText(data.situacao, data.situacao_cadastral);
  const legalNature = firstText(data.natureza, data.natureza_juridica);
  const porte = firstText(data.porte);
  const custom_domain = (data.custom_domain as string | null) || "";
  const domain_mode = (data.domain_mode as string | null) || "";
  const base_domain =
    (data.base_domain as string | null) || hostBaseDomain || "plpainel.com";
  const siteSlug = (data.slug as string | null) || slug;
  const displayDomain =
    domain_mode === "custom_domain" && custom_domain
      ? custom_domain
      : `${siteSlug}.${base_domain}`;

  const igUrl = normalizeInstagram(instagram);
  const waUrl = normalizeWhatsApp(whatsapp);
  const waCta = waWithText(waUrl, "Olá, gostaria de mais informações.");
  const siteDescription = compactText(
    mission ||
      about ||
      `${company_name} - pagina oficial com dados cadastrais, canais de contato e informacoes institucionais.`
  );
  const pageJsonLd = buildOrganizationJsonLd({
    companyName: company_name,
    cnpj,
    description: siteDescription,
    displayDomain,
    phone,
    email,
    whatsapp,
    address: registeredAddress,
    city,
    state: uf,
    igUrl,
  });

  if (template_type === "simple") {
    return (
      <main className="min-h-screen bg-black text-white">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: pageJsonLd }}
        />
        <div className="mx-auto flex max-w-5xl flex-col items-center px-4 py-12 sm:py-16">
          {logo_url ? (
            <img
              src={logo_url}
              alt={company_name}
              className="w-[220px] max-w-full object-contain sm:w-[260px]"
            />
          ) : null}

          <h1 className="mt-8 text-center text-2xl font-bold sm:text-3xl">
            Quem é {simple_title || company_name}?
          </h1>

          <div className="mt-8 max-w-3xl text-center">
            <p className="whitespace-pre-line text-sm leading-7 text-gray-200 sm:text-base sm:leading-8">
              {about_simple || about || "—"}
            </p>
          </div>
        </div>

        <footer className="mt-16 w-full bg-blue-700 px-6 py-8 text-center text-sm text-white">
          <div className="mx-auto max-w-5xl whitespace-pre-line leading-7">
            <div className="mb-3 font-semibold">CNPJ: {cnpj} | {displayDomain}</div>
            {footer}
          </div>
        </footer>
      </main>
    );
  }

  return (
    <ModernPublicSite
      company_name={company_name}
      cnpj={cnpj}
      mission={mission}
      phone={phone}
      email={email}
      whatsapp={whatsapp}
      about={about}
      privacy={privacy}
      footer={footer}
      logo_url={logo_url}
      displayDomain={displayDomain}
      officialActivity={officialActivity}
      registeredAddress={registeredAddress}
      openedAt={openedAt}
      city={city}
      uf={uf}
      companyStatus={companyStatus}
      legalNature={legalNature}
      porte={porte}
      templateType={template_type}
      igUrl={igUrl}
      waCta={waCta}
    />
  );


}
