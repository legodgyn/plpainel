export type CompanyTextInput = {
  legalName: string;
  fantasyName?: string | null;
  cnpj: string;
  openedAt?: string | null;
  city?: string | null;
  state?: string | null;
  size?: string | null;
  legalNature?: string | null;
  mainActivity?: string | null;
  address?: string | null;
};

function clean(value?: string | null) {
  return String(value || "").trim();
}

function fmtDateBR(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return iso || "";
  }
}

function joinParts(parts: Array<string | null | undefined>, separator = ", ") {
  return parts.map(clean).filter(Boolean).join(separator);
}

function lowerFirst(value: string) {
  if (!value) return value;
  return `${value.charAt(0).toLowerCase()}${value.slice(1)}`;
}

export function makeCompanyMission(input: CompanyTextInput) {
  const name = clean(input.fantasyName) || clean(input.legalName) || "nossa empresa";
  const activity = clean(input.mainActivity);
  const location = joinParts([input.city, input.state ? input.state.toUpperCase() : null], "/");

  if (activity) {
    return `A missão da ${name} é atuar com excelência em ${lowerFirst(
      activity
    )}, oferecendo soluções confiáveis, atendimento responsável e processos bem estruturados para clientes e parceiros${
      location ? ` em ${location} e região` : ""
    }.

Nosso compromisso é transformar conhecimento técnico, organização e proximidade no atendimento em resultados consistentes, sempre com foco em qualidade, transparência e crescimento sustentável.`;
  }

  return `A missão da ${name} é oferecer atendimento responsável, soluções bem estruturadas e suporte confiável para clientes e parceiros${
    location ? ` em ${location} e região` : ""
  }.

Trabalhamos com foco em qualidade, transparência e organização para gerar valor real em cada contato, projeto e relacionamento comercial.`;
}

export function makeCompanyAbout(input: CompanyTextInput) {
  const legalName = clean(input.legalName) || "Empresa";
  const name = clean(input.fantasyName) || legalName;
  const location = joinParts([input.city, input.state ? input.state.toUpperCase() : null], "/");
  const opened = fmtDateBR(input.openedAt);
  const size = clean(input.size);
  const legalNature = clean(input.legalNature);
  const activity = clean(input.mainActivity);
  const address = clean(input.address);

  return `QUEM SOMOS?

A ${legalName}, registrada sob o CNPJ ${input.cnpj}${opened ? ` e com início de atividades em ${opened}` : ""}${
    location ? `, está localizada em ${location}` : ""
  }.

${name} atua${activity ? ` no segmento de ${lowerFirst(activity)}` : " com atendimento empresarial e soluções profissionais"}.${
    legalNature || size
      ? ` Conforme seu cadastro público, é ${joinParts(
          [size ? `uma empresa de porte ${lowerFirst(size)}` : null, legalNature ? `constituída como ${lowerFirst(legalNature)}` : null],
          " e "
        )}.`
      : ""
  }

Nosso trabalho é conduzido com responsabilidade, clareza e atenção às necessidades de cada cliente. Buscamos unir experiência, organização e atendimento próximo para entregar soluções coerentes com a realidade de cada projeto.

${address ? `Endereço cadastral: ${address}.` : ""}

Na ${name}, valorizamos relações transparentes, comunicação objetiva e compromisso com resultados consistentes.`;
}
