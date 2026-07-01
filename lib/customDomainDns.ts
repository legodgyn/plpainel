import { resolve4, resolve6 } from "node:dns/promises";

export const DEFAULT_CUSTOM_DOMAIN_IP = "147.93.186.133";

export type CustomDomainDnsCheck = {
  ok: boolean;
  domain: string;
  expectedIp: string;
  records: string[];
  aRecords: string[];
  aaaaRecords: string[];
  message: string;
};

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort();
}

export async function checkCustomDomainDns(domain: string, expectedIp: string): Promise<CustomDomainDnsCheck> {
  const [aRecords, aaaaRecords] = await Promise.all([
    resolve4(domain).then(uniqueSorted).catch(() => [] as string[]),
    resolve6(domain).then(uniqueSorted).catch(() => [] as string[]),
  ]);

  const unexpectedARecords = aRecords.filter((record) => record !== expectedIp);

  if (!aRecords.includes(expectedIp)) {
    return {
      ok: false,
      domain,
      expectedIp,
      records: aRecords,
      aRecords,
      aaaaRecords,
      message: "Registro A ainda nao aponta para o IP esperado.",
    };
  }

  if (unexpectedARecords.length > 0) {
    return {
      ok: false,
      domain,
      expectedIp,
      records: aRecords,
      aRecords,
      aaaaRecords,
      message: "Remova os registros A extras antes de emitir o SSL.",
    };
  }

  if (aaaaRecords.length > 0) {
    return {
      ok: false,
      domain,
      expectedIp,
      records: aRecords,
      aRecords,
      aaaaRecords,
      message: "Remova o registro AAAA/IPv6 antes de emitir o SSL.",
    };
  }

  return {
    ok: true,
    domain,
    expectedIp,
    records: aRecords,
    aRecords,
    aaaaRecords,
    message: "Registro A configurado corretamente.",
  };
}
