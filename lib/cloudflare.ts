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
] as const;

type RootDomain = (typeof ROOT_DOMAINS)[number];

type CloudflareApiResponse<T> = {
  success: boolean;
  errors?: Array<{ message?: string }>;
  messages?: Array<{ message?: string }>;
  result?: T;
};

type CloudflareDnsRecord = {
  id: string;
  type: string;
  name: string;
  content: string;
  ttl?: number;
  proxied?: boolean;
};

function env(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env: ${name}`);
  }
  return value;
}

function getCleanHost(host: string) {
  return String(host || "").trim().toLowerCase();
}

export function getBaseDomain(domain: string): RootDomain {
  const clean = getCleanHost(domain);

  for (const root of ROOT_DOMAINS) {
    if (clean === root || clean.endsWith(`.${root}`)) {
      return root;
    }
  }

  throw new Error(`Base domain não encontrada para: ${domain}`);
}

export function getSubdomainLabel(domain: string): string {
  const baseDomain = getBaseDomain(domain);
  const clean = getCleanHost(domain);

  if (clean === baseDomain) {
    return "@";
  }

  const suffix = `.${baseDomain}`;
  if (!clean.endsWith(suffix)) {
    throw new Error(`Domínio inválido para base ${baseDomain}: ${domain}`);
  }

  const sub = clean.slice(0, -suffix.length).trim();

  if (!sub) return "@";

  return sub;
}

export function getZoneIdByBaseDomain(baseDomain: string): string {
  switch (baseDomain) {
    case "workersdevelopers.com.br":
      return env("CLOUDFLARE_ZONE_ID_WORKERSDEVELOPERS");
    case "bmworkers.com.br":
      return env("CLOUDFLARE_ZONE_ID_BMWORKERS");
    case "workersdev.com.br":
      return env("CLOUDFLARE_ZONE_ID_WORKERSDEV");
    case "plpainel.com":
      return env("CLOUDFLARE_ZONE_ID_PLPAINEL");
    case "acmpainel.com.br":
      return env("CLOUDFLARE_ZONE_ID_ACMPAINEL");
    case "ehspainel.com.br":
      return env("CLOUDFLARE_ZONE_ID_EHSPAINEL");
    case "lcppainel.com.br":
      return env("CLOUDFLARE_ZONE_ID_LCPPAINEL");
    case "lcspainel.com.br":
      return env("CLOUDFLARE_ZONE_ID_LCSPAINEL");
    case "mapspainel.com.br":
      return env("CLOUDFLARE_ZONE_ID_MAPSPAINEL");
    case "fusionmix.com.br":
      return env("CLOUDFLARE_ZONE_ID_FUSIONMIX");
    case "atronix.com.br":
      return env("CLOUDFLARE_ZONE_ID_ATRONIX");
    case "lumixx.com.br":
      return env("CLOUDFLARE_ZONE_ID_LUMIXX");
    case "witchdoctor.com.br":
      return env("CLOUDFLARE_ZONE_ID_WITCHDOCTOR");
    case "drowranger.com.br":
      return env("CLOUDFLARE_ZONE_ID_DROWRANGER");
    case "avryxon.com.br":
      return env("CLOUDFLARE_ZONE_ID_AVRYXON");
    case "zylaris.com.br":
      return env("CLOUDFLARE_ZONE_ID_ZYLARIS");
    case "zytrenko.com.br":
      return env("CLOUDFLARE_ZONE_ID_ZYTRENKO");
    case "novoryn.com.br":
      return env("CLOUDFLARE_ZONE_ID_NOVORYN");
    case "voryxel.com.br":
      return env("CLOUDFLARE_ZONE_ID_VORYXEL");
    case "mavoryx.com.br":
      return env("CLOUDFLARE_ZONE_ID_MAVORYX");
    case "monstergyn.com.br":
      return env("CLOUDFLARE_ZONE_ID_MONSTERGYN");
    case "stormgyn.com.br":
      return env("CLOUDFLARE_ZONE_ID_STORMGYN");
    case "stronggyn.com.br":
      return env("CLOUDFLARE_ZONE_ID_STRONGGYN");
    case "123hexa.com.br":
      return env("CLOUDFLARE_ZONE_ID_123HEXA");
    case "brhexa.com.br":
      return env("CLOUDFLARE_ZONE_ID_BRHEXA");
    case "h3xa.com.br":
      return env("CLOUDFLARE_ZONE_ID_H3XA");
    case "pl01.com.br":
      return env("CLOUDFLARE_ZONE_ID_PL01");
    case "pl02.com.br":
      return env("CLOUDFLARE_ZONE_ID_PL02");
    case "pl03.com.br":
      return env("CLOUDFLARE_ZONE_ID_PL03");
    case "lcp1.com.br":
      return env("CLOUDFLARE_ZONE_ID_LCP1");
    case "lcp2.com.br":
      return env("CLOUDFLARE_ZONE_ID_LCP2");
    case "lcp3.com.br":
      return env("CLOUDFLARE_ZONE_ID_LCP3");
    case "lcp4.com.br":
      return env("CLOUDFLARE_ZONE_ID_LCP4");
    case "lcp5.com.br":
      return env("CLOUDFLARE_ZONE_ID_LCP5");
    case "lcp6.com.br":
      return env("CLOUDFLARE_ZONE_ID_LCP6");
    default:
      throw new Error(`Domínio sem zone configurada: ${baseDomain}`);
  }
}

async function cloudflareFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const token = env("CLOUDFLARE_API_TOKEN");

  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const data = (await res.json()) as CloudflareApiResponse<T>;

  if (!res.ok || !data.success) {
    const message =
      data?.errors?.map((e) => e.message).filter(Boolean).join(" | ") ||
      `Cloudflare error: ${res.status}`;
    throw new Error(message);
  }

  return data.result as T;
}

export async function listDnsRecords(params: {
  domain: string;
  type?: string;
}): Promise<CloudflareDnsRecord[]> {
  const baseDomain = getBaseDomain(params.domain);
  const zoneId = getZoneIdByBaseDomain(baseDomain);

  const query = new URLSearchParams();
  query.set("name", getCleanHost(params.domain));

  if (params.type) {
    query.set("type", params.type);
  }

  return cloudflareFetch<CloudflareDnsRecord[]>(
    `/zones/${zoneId}/dns_records?${query.toString()}`
  );
}

async function createARecord(params: {
  domain: string;
  content: string;
  ttl?: number;
  proxied?: boolean;
}) {
  const baseDomain = getBaseDomain(params.domain);
  const zoneId = getZoneIdByBaseDomain(baseDomain);
  const name = getSubdomainLabel(params.domain);

  return cloudflareFetch<CloudflareDnsRecord>(
    `/zones/${zoneId}/dns_records`,
    {
      method: "POST",
      body: JSON.stringify({
        type: "A",
        name,
        content: params.content,
        ttl: params.ttl ?? 1,
        proxied: params.proxied ?? true,
      }),
    }
  );
}

export async function createTxtRecord(params: {
  domain: string;
  content: string;
  ttl?: number;
}) {
  const baseDomain = getBaseDomain(params.domain);
  const zoneId = getZoneIdByBaseDomain(baseDomain);
  const name = getSubdomainLabel(params.domain);

  return cloudflareFetch<CloudflareDnsRecord>(
    `/zones/${zoneId}/dns_records`,
    {
      method: "POST",
      body: JSON.stringify({
        type: "TXT",
        name,
        content: params.content,
        ttl: params.ttl ?? 120,
      }),
    }
  );
}

export async function updateDnsRecord(params: {
  domain: string;
  recordId: string;
  content: string;
  ttl?: number;
}) {
  const baseDomain = getBaseDomain(params.domain);
  const zoneId = getZoneIdByBaseDomain(baseDomain);
  const name = getSubdomainLabel(params.domain);

  return cloudflareFetch<CloudflareDnsRecord>(
    `/zones/${zoneId}/dns_records/${params.recordId}`,
    {
      method: "PUT",
      body: JSON.stringify({
        type: "TXT",
        name,
        content: params.content,
        ttl: params.ttl ?? 120,
      }),
    }
  );
}

async function ensureExactWebRecordForSubdomain(domain: string) {
  const cleanDomain = getCleanHost(domain);
  const baseDomain = getBaseDomain(cleanDomain);

  if (cleanDomain === baseDomain) {
    return;
  }

  const [exactA, exactAAAA, exactCNAME, wildcardA] = await Promise.all([
    listDnsRecords({ domain: cleanDomain, type: "A" }),
    listDnsRecords({ domain: cleanDomain, type: "AAAA" }),
    listDnsRecords({ domain: cleanDomain, type: "CNAME" }),
    listDnsRecords({ domain: `*.${baseDomain}`, type: "A" }),
  ]);

  const hasExactWebRecord =
    exactA.length > 0 || exactAAAA.length > 0 || exactCNAME.length > 0;

  if (hasExactWebRecord) {
    return;
  }

  const wildcard = wildcardA.find(
    (r) =>
      r.type === "A" &&
      getCleanHost(r.name) === getCleanHost(`*.${baseDomain}`)
  );

  if (!wildcard) {
    return;
  }

  await createARecord({
    domain: cleanDomain,
    content: wildcard.content,
    ttl: wildcard.ttl,
    proxied: wildcard.proxied ?? true,
  });
}

export async function upsertTxtRecord(params: {
  domain: string;
  content: string;
  ttl?: number;
}) {
  await ensureExactWebRecordForSubdomain(params.domain);

  const existing = await listDnsRecords({
    domain: params.domain,
    type: "TXT",
  });

  const exact = existing.find(
    (r) =>
      r.type === "TXT" &&
      getCleanHost(r.name) === getCleanHost(params.domain)
  );

  if (exact) {
    return updateDnsRecord({
      domain: params.domain,
      recordId: exact.id,
      content: params.content,
      ttl: params.ttl,
    });
  }

  return createTxtRecord(params);
}

export async function deleteDnsRecord(params: {
  domain: string;
  recordId: string;
}) {
  const baseDomain = getBaseDomain(params.domain);
  const zoneId = getZoneIdByBaseDomain(baseDomain);

  return cloudflareFetch<{ id: string }>(
    `/zones/${zoneId}/dns_records/${params.recordId}`,
    {
      method: "DELETE",
    }
  );
}
