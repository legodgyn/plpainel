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
  about: string;
  privacy: string | null;
  footer: string;
  logo_url: string;
  displayDomain: string;
  officialActivity: string;
  igUrl: string | null;
  waCta: string | null;
};

function ModernPublicSite({
  company_name,
  cnpj,
  mission,
  phone,
  email,
  about,
  privacy,
  footer,
  logo_url,
  displayDomain,
  officialActivity,
  igUrl,
  waCta,
}: ModernPublicSiteProps) {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <PublicCriticalCss />
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex min-h-[74px] w-full max-w-6xl flex-col gap-4 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <a href="#home" className="flex min-w-0 items-center gap-3">
            {logo_url ? (
              <img src={logo_url} alt={company_name} className="h-11 w-11 rounded-xl object-contain" />
            ) : (
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-teal-700 to-emerald-500 text-lg font-black text-white shadow-[0_10px_20px_rgba(16,185,129,.24)]">
                {(company_name?.[0] || "E").toUpperCase()}
              </div>
            )}
            <div className="min-w-0 leading-tight">
              <strong className="block truncate text-sm text-slate-950">{company_name}</strong>
              <span className="mt-1 block truncate text-xs text-slate-500">Atendimento profissional</span>
            </div>
          </a>

          <nav className="flex flex-wrap items-center gap-2 sm:justify-end">
            <a href="#home" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Home</a>
            <a href="#sobre" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Sobre</a>
            <a href="#servicos" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Serviços</a>
            <a href="#dados" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Dados oficiais</a>
            {waCta ? (
              <a href={waCta} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-700 to-emerald-500 px-4 text-sm font-extrabold text-white shadow-[0_12px_25px_rgba(16,185,129,.24)]">
                Contato
              </a>
            ) : null}
          </nav>
        </div>
      </header>

      <section id="home" className="bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,.24),transparent_24rem),linear-gradient(90deg,#0f766e_0%,#059669_56%,#34d399_100%)] px-4 py-16 text-white">
        <div className="mx-auto max-w-6xl text-center">
          <h1 className="mx-auto max-w-4xl text-3xl font-black leading-tight tracking-normal sm:text-5xl">
            {company_name}
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-8 text-white/90 sm:text-lg">
            {mission || "Atendimento profissional, qualidade e confiança em uma página oficial com informações claras sobre a empresa."}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a href="#servicos" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-extrabold text-teal-700">
              Ver serviços
            </a>
            {waCta ? (
              <a href={waCta} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/40 bg-white/10 px-5 text-sm font-extrabold text-white">
                Chamar no WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="px-4 py-10">
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-3">
          <article id="sobre" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,.08)]">
            <h3 className="text-lg font-black">Quem somos</h3>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-500">
              {about || "Esta empresa atua com atendimento profissional, comunicação clara e foco em qualidade."}
            </p>
          </article>

          <article id="servicos" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,.08)]">
            <h3 className="text-lg font-black">O que fazemos</h3>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-7 text-slate-500">
              <li>{company_name}</li>
              <li>Atendimento profissional</li>
              <li>Qualidade e confiança</li>
              <li>Suporte e agilidade</li>
            </ul>
          </article>

          <article id="contato" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,.08)]">
            <h3 className="text-lg font-black">Contato</h3>
            <div className="mt-3 grid gap-3 text-sm font-bold text-slate-900">
              {phone ? <div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-teal-700">☎</span>{phone}</div> : null}
              {email ? <div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-teal-700">@</span><span className="break-all">{email}</span></div> : null}
              {waCta ? <a href={waCta} target="_blank" rel="noreferrer" className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-teal-700">→</span>Chamar no WhatsApp</a> : null}
              {igUrl ? <a href={igUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-teal-700">◎</span>Instagram</a> : null}
            </div>
          </article>
        </div>
      </section>

      <section id="dados" className="bg-emerald-50 px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-2xl font-black">Dados oficiais</h2>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_20px_rgba(15,23,42,.06)]">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <small className="block text-xs font-black uppercase tracking-wide text-slate-500">Razão Social</small>
                <div className="mt-2 text-sm font-black leading-5">{company_name}</div>
              </div>
              <div>
                <small className="block text-xs font-black uppercase tracking-wide text-slate-500">CNPJ</small>
                <div className="mt-2 text-sm font-black leading-5">{cnpj}</div>
              </div>
              <div>
                <small className="block text-xs font-black uppercase tracking-wide text-slate-500">Domínio</small>
                <div className="mt-2 break-all text-sm font-black leading-5">{displayDomain}</div>
              </div>
              <div>
                <small className="block text-xs font-black uppercase tracking-wide text-slate-500">Atividade</small>
                <div className="mt-2 text-sm font-black leading-5">{officialActivity || "Atendimento profissional"}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {mission ? (
        <section className="px-4 py-10">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-4 text-2xl font-black">Nossa missão</h2>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_28px_rgba(15,23,42,.08)]">
              <p className="whitespace-pre-line text-sm leading-8 text-slate-700">{mission}</p>
            </div>
          </div>
        </section>
      ) : null}

      <footer className="bg-teal-950 px-4 py-8 text-white/85">
        <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-[1.5fr_.8fr]">
          <div>
            <div className="mb-2 font-black text-white">{company_name}</div>
            <div className="whitespace-pre-line text-sm leading-7 text-white/70">{footer}</div>
          </div>
          <div className="grid content-start gap-3 sm:justify-end">
            {privacy ? <a href="#privacy-modal" className="text-sm font-bold text-white/90">Política de Privacidade</a> : null}
            <a href="#home" className="text-sm font-bold text-white/90">Voltar ao topo</a>
          </div>
        </div>
      </footer>

      {privacy ? (
        <div
          id="privacy-modal"
          className="invisible fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-5 opacity-0 transition target:visible target:opacity-100"
        >
          <a href="#home" className="absolute inset-0" aria-label="Fechar política de privacidade" />
          <div className="relative max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-7 shadow-[0_30px_60px_rgba(0,0,0,.25)]">
            <a
              href="#home"
              aria-label="Fechar"
              className="absolute right-4 top-3 text-2xl font-bold text-slate-500 hover:text-slate-900"
            >
              ×
            </a>
            <h2 className="pr-8 text-2xl font-black text-slate-950">Política de Privacidade</h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-8 text-slate-700">{privacy}</p>
          </div>
        </div>
      ) : null}
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
  const officialActivity =
    (data.cnae_principal as string | null) ||
    (data.natureza as string | null) ||
    "";
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
      about={about}
      privacy={privacy}
      footer={footer}
      logo_url={logo_url}
      displayDomain={displayDomain}
      officialActivity={officialActivity}
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
