import type { Metadata } from "next";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { slug: string } | Promise<{ slug: string }>;
};

const ROOT_DOMAINS = [
  "plpainel.com",
  "acmpainel.com.br",
  "ehspainel.com.br",
  "lcppainel.com.br",
  "lcspainel.com.br",
  "mapspainel.com.br",
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
    const { data } = await supabase
      .from("sites")
      .select("*")
      .eq("custom_domain", slug.toLowerCase())
      .eq("domain_mode", "custom_domain")
      .eq("is_public", true)
      .maybeSingle();

    if (data) return data;
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
  igUrl,
  waCta,
}: ModernPublicSiteProps) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <PublicCriticalCss />
      <div className="bg-[linear-gradient(90deg,rgba(15,118,110,.10),transparent_38%),linear-gradient(180deg,#fbfcff_0%,#f8fafc_54%,#ffffff_100%)]">
        <div className="mx-auto w-full max-w-6xl px-4 py-7">
          <nav className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-[0_18px_60px_rgba(16,24,40,.08)] sm:flex-row sm:items-center sm:justify-between">
            <a href="#" className="flex min-w-0 items-center gap-3">
              {logo_url ? (
                <img src={logo_url} alt={company_name} className="h-12 w-12 rounded-xl object-contain" />
              ) : (
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-teal-700 text-xl font-black text-white">
                  {(company_name?.[0] || "E").toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate font-bold text-slate-950">{company_name}</div>
                <div className="mt-0.5 truncate text-xs text-slate-500">{displayDomain}</div>
              </div>
            </a>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <a href="#quem-somos" className="inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-bold text-slate-600">
                Quem somos
              </a>
              {privacy ? (
                <a href="#privacidade" className="inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-bold text-slate-600">
                  Privacidade
                </a>
              ) : null}
              {waCta ? (
                <a href={waCta} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-extrabold text-white">
                  WhatsApp
                </a>
              ) : null}
            </div>
          </nav>

          <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_430px]">
            <div
              className="flex min-h-[560px] flex-col justify-end rounded-[28px] bg-cover bg-center p-7 text-white sm:p-10"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, rgba(16,24,40,.84), rgba(15,118,110,.74)), url('https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80')",
              }}
            >
              <div className="w-fit rounded-full border border-white/25 bg-white/10 px-3 py-2 text-xs font-extrabold backdrop-blur">
                CNPJ verificado - Atendimento oficial
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-none tracking-normal sm:text-6xl">
                Presença digital com aparência de empresa grande.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/80 sm:text-lg">
                Um site público elegante para apresentar a empresa, transmitir confiança e levar o visitante direto para o atendimento.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                {waCta ? (
                  <a href={waCta} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 text-sm font-black text-slate-950">
                    Chamar no WhatsApp
                  </a>
                ) : null}
                <a href="#quem-somos" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/30 px-5 text-sm font-black text-white">
                  Ver informações
                </a>
              </div>
            </div>

            <aside className="grid gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_14px_40px_rgba(16,24,40,.06)]">
                <h2 className="text-2xl font-black">{company_name}</h2>
                <p className="mt-3 leading-7 text-slate-500">
                  Dados principais da empresa, canais oficiais e informações institucionais reunidos em uma página profissional.
                </p>
                <div className="mt-5 grid gap-3 text-sm">
                  <div className="flex items-start justify-between gap-4 rounded-xl bg-slate-50 p-3">
                    <span className="text-slate-500">CNPJ</span>
                    <b className="text-right">{cnpj}</b>
                  </div>
                  <div className="flex items-start justify-between gap-4 rounded-xl bg-slate-50 p-3">
                    <span className="text-slate-500">Domínio</span>
                    <b className="break-all text-right">{displayDomain}</b>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-white shadow-[0_14px_40px_rgba(16,24,40,.10)]">
                <h3 className="text-xl font-black">Contato rápido</h3>
                <p className="mt-3 leading-7 text-white/65">Canais oficiais da empresa reunidos em um lugar só.</p>
                <div className="mt-5 grid gap-3 text-sm">
                  {email ? (
                    <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
                      <span className="text-white/55">Email</span>
                      <b className="break-all text-right">{email}</b>
                    </div>
                  ) : null}
                  {phone ? (
                    <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
                      <span className="text-white/55">Telefone</span>
                      <b className="text-right">{phone}</b>
                    </div>
                  ) : null}
                  {whatsapp ? (
                    <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
                      <span className="text-white/55">WhatsApp</span>
                      <b className="text-right">{whatsapp}</b>
                    </div>
                  ) : null}
                  {igUrl ? (
                    <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
                      <span className="text-white/55">Instagram</span>
                      <a className="text-right font-bold" href={igUrl} target="_blank" rel="noreferrer">
                        Acessar
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>
            </aside>
          </section>
        </div>
      </div>

      <section id="quem-somos" className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="mb-5 grid gap-5 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
          <h2 className="m-0 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
            Informações completas para gerar confiança.
          </h2>
          <p className="m-0 leading-8 text-slate-500">
            Dados institucionais, missão, canais de contato e política de privacidade com leitura clara em qualquer tela.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-6">
            <span className="inline-flex rounded-full bg-emerald-50 px-3 py-2 text-xs font-black uppercase text-teal-700">
              Quem somos
            </span>
            <h3 className="mt-3 text-xl font-black">{company_name}</h3>
            <p className="mt-4 whitespace-pre-line leading-8 text-slate-600">{about || "—"}</p>
          </article>

          {mission ? (
            <article className="rounded-2xl border border-teal-100 bg-teal-50 p-6">
              <span className="inline-flex rounded-full bg-emerald-100 px-3 py-2 text-xs font-black uppercase text-teal-700">
                Nossa missão
              </span>
              <h3 className="mt-3 text-xl font-black">Atender com clareza</h3>
              <p className="mt-4 whitespace-pre-line leading-8 text-slate-700">{mission}</p>
            </article>
          ) : null}
        </div>
      </section>

      {privacy ? (
        <section id="privacidade" className="mx-auto w-full max-w-6xl px-4 py-8">
          <article className="rounded-2xl border border-slate-200 bg-white p-6">
            <span className="inline-flex rounded-full bg-emerald-50 px-3 py-2 text-xs font-black uppercase text-teal-700">
              Política de privacidade
            </span>
            <h3 className="mt-3 text-xl font-black">Transparência no uso de dados</h3>
            <p className="mt-4 whitespace-pre-line leading-8 text-slate-600">{privacy}</p>
          </article>
        </section>
      ) : null}

      <footer className="mx-auto mt-6 w-full max-w-6xl border-t border-slate-200 px-4 py-8">
        <div className="whitespace-pre-line text-sm leading-7 text-slate-500">{footer}</div>
      </footer>
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

  const cleanHost = getCleanHost(host);
  const publicUrl = `https://${cleanHost}/`;

  const metaName = extractMetaName((data?.meta_verify_name as string | null) ?? null);
  const metaContent = extractMetaContent(
    (data?.meta_verify_content as string | null) ?? null
  );

  return {
    title,
    alternates: {
      canonical: publicUrl,
    },
    openGraph: {
      url: publicUrl,
      title,
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
  const custom_domain = (data.custom_domain as string | null) || "";
  const domain_mode = (data.domain_mode as string | null) || "";
  const base_domain =
    (data.base_domain as string | null) || hostBaseDomain || "plpainel.com";
  const displayDomain =
    domain_mode === "custom_domain" && custom_domain
      ? custom_domain
      : `${slug}.${base_domain}`;

  const igUrl = normalizeInstagram(instagram);
  const waUrl = normalizeWhatsApp(whatsapp);
  const waCta = waWithText(waUrl, "Olá, gostaria de mais informações.");

  if (template_type === "simple") {
    return (
      <main className="min-h-screen bg-black text-white">
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
      igUrl={igUrl}
      waCta={waCta}
    />
  );

  return (
    <main className="public-site min-h-screen bg-[#F5F0FA] text-slate-900">
      <PublicCriticalCss />
      <header className="border-b border-purple-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full border border-purple-200 bg-purple-50 text-purple-900">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M14 9a3 3 0 10-6 0v1H6a2 2 0 00-2 2v8h16v-8a2 2 0 00-2-2h-2V9z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="leading-tight">
              <div className="text-xs text-slate-500">Página pública</div>
              <div className="text-sm font-semibold text-slate-900">
                {displayDomain}
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-md bg-purple-800 px-4 py-2 text-sm font-semibold text-white opacity-70"
          >
            LOGIN
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 pb-8 pt-10">
        <div className="rounded-2xl border border-purple-200 bg-white shadow-sm">
          <div className="p-7 sm:p-10">
            <div className="flex flex-col items-center text-center">
              <div className="grid h-[180px] w-[180px] place-items-center rounded-full bg-purple-800 text-white shadow-sm">
                <span className="text-6xl font-extrabold">
                  {(company_name?.[0] || "E").toUpperCase()}
                </span>
              </div>

              <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                {company_name}
              </h1>

              <div className="mt-2 text-sm text-slate-700 sm:text-base">
                <span className="font-semibold text-slate-900">CNPJ:</span> {cnpj}
              </div>

              {mission ? (
                <div className="mt-8 w-full max-w-3xl rounded-xl border border-purple-200 bg-white p-6 text-left">
                  <div className="text-xs font-extrabold tracking-widest text-purple-700">
                    NOSSA MISSÃO
                  </div>
                  <div className="mt-3 whitespace-pre-line text-sm font-semibold leading-relaxed text-slate-800 sm:text-base">
                    {mission}
                  </div>
                </div>
              ) : null}

              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                {waCta ? (
                  <a
                    href={waCta || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md bg-purple-800 px-6 py-3 text-sm font-extrabold text-white hover:bg-purple-900"
                  >
                    CONVERSAR AGORA
                  </a>
                ) : null}

                {igUrl ? (
                  <a
                    href={igUrl || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-purple-300 bg-purple-50 px-6 py-3 text-sm font-extrabold text-purple-900 hover:bg-purple-100"
                  >
                    INSTAGRAM
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-14">
        <div className="grid gap-6 md:grid-cols-[1.4fr_.6fr]">
          <div className="rounded-2xl border border-purple-200 bg-white p-6 shadow-sm sm:p-7">
            <h2 className="text-lg font-extrabold text-slate-900">QUEM SOMOS?</h2>
            <div className="mt-4 whitespace-pre-line leading-relaxed text-slate-800">
              {about || "—"}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-purple-200 bg-white p-6 shadow-sm sm:p-7">
              <h3 className="text-sm font-extrabold tracking-widest text-purple-700">
                CONTATO
              </h3>

              <div className="mt-4 space-y-2 text-sm text-slate-800">
                {phone ? (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">Telefone</span>
                    <span className="text-right font-semibold">{phone}</span>
                  </div>
                ) : null}

                {email ? (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">E-mail</span>
                    <span className="text-right font-semibold">{email}</span>
                  </div>
                ) : null}

                {whatsapp ? (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">WhatsApp</span>
                    <span className="text-right font-semibold">{whatsapp}</span>
                  </div>
                ) : null}
              </div>

              {waCta ? (
                <a
                  href={waCta || undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 block rounded-md bg-purple-800 px-5 py-3 text-center text-sm font-extrabold text-white hover:bg-purple-900"
                >
                  FALAR NO WHATSAPP
                </a>
              ) : null}
            </div>

            <div className="rounded-2xl border border-purple-200 bg-white p-6 text-center shadow-sm sm:p-7">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-purple-200 bg-purple-50 text-purple-900">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M12 16a4 4 0 100-8 4 4 0 000 8z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M17.5 6.5h.01"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div className="mt-3 text-sm font-extrabold text-slate-900">
                INSTAGRAM
              </div>

              <a
                href={igUrl || "#"}
                target="_blank"
                rel="noreferrer"
                className={`mt-4 inline-flex items-center justify-center rounded-md px-5 py-3 text-sm font-extrabold ${
                  igUrl
                    ? "border border-purple-300 bg-purple-50 text-purple-900 hover:bg-purple-100"
                    : "pointer-events-none bg-slate-100 text-slate-400"
                }`}
              >
                ACESSAR
              </a>
            </div>
          </div>
        </div>

        {privacy ? (
          <div className="mt-6">
            <div className="rounded-2xl border border-purple-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="text-xs font-extrabold tracking-widest text-purple-700">
                POLÍTICA DE PRIVACIDADE
              </div>
              <div className="mt-3 whitespace-pre-line text-sm font-semibold leading-relaxed text-slate-800 sm:text-base">
                {privacy}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <footer className="border-t border-purple-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <div className="whitespace-pre-line text-sm text-slate-700">{footer}</div>

          <div className="mt-6">
            <a
              href="https://policies.google.com/privacy?hl=pt-BR"
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-purple-900 underline underline-offset-4"
            >
              Políticas de privacidade
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
