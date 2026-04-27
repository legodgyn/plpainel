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
  const parts = withoutBase.split(".").filter(Boolean);
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
    slug,
  };
}

async function findSite(slug: string, hostBaseDomain: string | null) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

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

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug, host, hostBaseDomain } = await resolveSiteContext(props);

  if (!slug) {
    return {
      title: "Site público",
    };
  }

  const data = await findSite(slug, hostBaseDomain);

  const title = data?.company_name || "Site público";
  const description =
    data?.mission?.slice(0, 160) ||
    `Site oficial de ${title}`;

  const cleanHost = getCleanHost(host);
  const publicUrl = `https://${cleanHost}/`;

  const metaContent = extractMetaContent(
    data?.meta_verify_content || data?.meta_verify_name
  );

  return {
    title,
    description,

    openGraph: {
      url: publicUrl,
      title,
      description,
      type: "website",
      siteName: title,
    },

    twitter: {
      card: "summary",
      title,
      description,
    },

    alternates: {
      canonical: publicUrl,
    },

    // 🔥 AQUI É O MAIS IMPORTANTE
    other: metaContent
      ? {
          "facebook-domain-verification": metaContent,
        }
      : undefined,
  };
}

export default async function PublicSitePage(props: PageProps) {
  const { slug, hostBaseDomain } = await resolveSiteContext(props);

  if (!slug) {
    return <div>Site em configuração</div>;
  }

  const data = await findSite(slug, hostBaseDomain);

  if (!data) {
    return <div>Site em configuração</div>;
  }

  return (
    <main>
      <h1>{data.company_name}</h1>
    </main>
  );
}
