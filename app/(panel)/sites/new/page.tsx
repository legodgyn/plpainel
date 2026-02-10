"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

type Msg = { type: "ok" | "err"; text: string };

function onlyDigits(v: string) {
  return String(v || "").replace(/\D/g, "");
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

// DEV/local abre /s/slug, produção abre subdomínio
function buildPublicUrl(slug: string) {
  if (typeof window === "undefined") return `/s/${slug}`;

  const host = window.location.hostname;
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".local") ||
    host.endsWith(".localhost");

  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);

  if (isLocal || isIp) return `/s/${slug}`;
  return `https://${slug}.plpainel.com`;
}

/**
 * BrasilAPI CNPJ
 */
type BrasilApiCnpj = {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  data_inicio_atividade: string | null;
  descricao_situacao_cadastral: string | null;
  descricao_tipo_de_logradouro: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
  ddd_telefone_1: string | null;
  ddd_telefone_2: string | null;
  email: string | null;
  cnae_fiscal_descricao: string | null;
  capital_social: number | null;
};

function fmtMoneyBRL(n: number | null | undefined) {
  if (typeof n !== "number") return "";
  try {
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  } catch {
    return String(n);
  }
}

function makeMission(companyLegalName: string) {
  return `A missão da ${companyLegalName} é desenvolver e executar estratégias eficientes, orientadas a resultados, que fortaleçam a presença de marcas, ampliem oportunidades de negócio e impulsionem o crescimento sustentável de nossos clientes.

Atuamos com foco em marketing, publicidade e consultoria estratégica, oferecendo soluções personalizadas, baseadas em análise, criatividade, ética e comprometimento. Nosso propósito é gerar valor real por meio de campanhas bem estruturadas, comunicação assertiva e gestão responsável, sempre alinhados às necessidades e objetivos de cada cliente.`;
}

function makeAbout(p: {
  companyLegalName: string;
  cnpj: string;
  openedAt: string | null;
  cityUf: string;
  addressLine: string;
  activityDesc: string | null;
}) {
  return `QUEM SOMOS?

A ${p.companyLegalName}, registrada sob o CNPJ ${p.cnpj}, ${
    p.openedAt ? `foi fundada em ${p.openedAt}` : "foi fundada"
  }, na cidade de ${p.cityUf}. Atuamos como um parceiro estratégico integrado, oferecendo soluções estruturadas com foco em eficiência, organização e suporte às operações dos nossos clientes.

Nossa atividade principal, conforme a Receita Federal, é ${
    p.activityDesc || "a nossa atividade principal"
  }, que representa a base operacional de nossas atividades. Essa atuação é sustentada por processos bem definidos, gestão responsável e relações comerciais transparentes.

Localização:
${p.addressLine}

Nosso compromisso é atuar como uma extensão confiável da estrutura de nossos clientes, oferecendo suporte que contribua para o crescimento sustentável dos negócios.`;
}

function makePrivacy(p: {
  companyLegalName: string;
  cnpj: string;
  addressLine: string;
  email: string;
  phone: string;
}) {
  return `POLÍTICA DE PRIVACIDADE

${p.companyLegalName}
CNPJ: ${p.cnpj}
Endereço: ${p.addressLine}

1. Finalidade
Esta Política de Privacidade descreve como a ${p.companyLegalName} coleta, utiliza, armazena e protege dados pessoais de clientes, parceiros, fornecedores e usuários que interagem conosco por meio de nossos canais de comunicação (e-mail, telefone, redes sociais) ou durante a contratação e execução de nossos serviços.

2. Dados Coletados
Coletamos apenas os dados necessários para as finalidades descritas nesta política, incluindo:
- Informações fornecidas voluntariamente (nome, e-mail, telefone, dados profissionais e empresariais).
- Registros de comunicação, contratos, propostas e histórico de atendimento.
- Dados de navegação (quando aplicável), conforme políticas das plataformas utilizadas.

3. Uso dos Dados
Os dados pessoais coletados são utilizados exclusivamente para:
- Prestação e gestão dos serviços contratados;
- Comunicação operacional, administrativa e contratual;
- Cumprimento de obrigações legais e regulatórias;
- Melhoria contínua dos serviços e processos internos.

4. Compartilhamento de Dados
A ${p.companyLegalName} não comercializa dados pessoais. O compartilhamento ocorre apenas:
- Com parceiros/fornecedores essenciais à execução dos serviços, sob confidencialidade;
- Quando exigido por lei, ordem judicial ou autoridade competente.

5. Direitos do Titular (LGPD)
Nos termos da Lei nº 13.709/2018 (LGPD), o titular pode solicitar:
- Confirmação e acesso aos dados;
- Correção/atualização;
- Anonimização, bloqueio ou eliminação de dados excessivos;
- Portabilidade (quando aplicável);
- Revogação de consentimentos.

6. Armazenamento e Segurança
Adotamos medidas técnicas e administrativas adequadas para proteger dados pessoais contra acessos não autorizados, perdas ou divulgações indevidas. Os dados são armazenados pelo período necessário para cumprir as finalidades e obrigações legais.

7. Alterações
Esta política poderá ser atualizada periodicamente. Recomendamos a consulta regular.

8. Contato
📧 E-mail: ${p.email}
📞 Telefone: ${p.phone}

© ${new Date().getFullYear()} ${p.companyLegalName}. Todos os direitos reservados.`;
}

function makeFooter(p: {
  companyLegalName: string;
  cnpj: string;
  openedAt: string | null;
  status: string | null;
  capital: number | null;
  addressLine: string;
  email: string;
  phone: string;
}) {
  const year = new Date().getFullYear();
  return `${p.companyLegalName} | CNPJ: ${p.cnpj} | ${
    p.openedAt ? `Data de Abertura: ${p.openedAt} | ` : ""
  }${p.status ? `Situação Cadastral: ${p.status} | ` : ""}${
    p.capital != null ? `Capital Social: ${fmtMoneyBRL(p.capital)} | ` : ""
  }Endereço: ${p.addressLine} | Contato: 📧 ${p.email} 📞 ${p.phone} | © ${year} ${
    p.companyLegalName
  }. Todos os direitos reservados.`;
}

// ✅ email padrão: contato@<slug>.com (como você pediu)
function defaultCompanyEmailFromSlug(slug: string) {
  const s = slugify(slug);
  if (!s) return "";
  return `contato@${s}.com`;
}

// ✅ parse de meta tag: aceita "<meta ...>" ou só o código
function parseMetaTag(input: string) {
  const raw = String(input || "").trim();
  if (!raw) return { name: null as string | null, content: null as string | null };

  if (!raw.toLowerCase().includes("<meta")) {
    return { name: "facebook-domain-verification", content: raw };
  }

  const nameMatch = raw.match(/name\s*=\s*["']([^"']+)["']/i);
  const contentMatch = raw.match(/content\s*=\s*["']([^"']+)["']/i);

  return {
    name: nameMatch?.[1] ?? "facebook-domain-verification",
    content: contentMatch?.[1] ?? null,
  };
}

export default function NewSitePage() {
  const router = useRouter();

  const [msg, setMsg] = useState<Msg | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Campos do form
  const [cnpj, setCnpj] = useState("");
  const [slug, setSlug] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");

  // ✅ novos campos
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("instagram.com");
  const [facebook, setFacebook] = useState("facebook.com");
  const [email, setEmail] = useState(""); // contato@slug.com
  const [metaTagRaw, setMetaTagRaw] = useState(""); // pessoa cola aqui

  const [mission, setMission] = useState("");
  const [about, setAbout] = useState("");
  const [privacy, setPrivacy] = useState("");
  const [footer, setFooter] = useState("");

  const [isPublic, setIsPublic] = useState(true);

  // auth check
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingUser(true);
      const { data } = await supabase.auth.getUser();
      if (!alive) return;

      if (!data.user) {
        router.push("/login");
        return;
      }

      setLoadingUser(false);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  // ✅ sempre que mudar slug, atualiza email padrão se estiver vazio ou se já era contato@<algo>.com
  useEffect(() => {
    const s = slugify(slug);
    if (!s) return;

    const next = defaultCompanyEmailFromSlug(s);

    // se o user nunca mexeu no email ou tá no padrão antigo, atualiza
    if (!email || email.startsWith("contato@")) {
      setEmail(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function handleGenerate() {
    setMsg(null);

    const clean = onlyDigits(cnpj);
    if (clean.length !== 14) {
      setMsg({ type: "err", text: "CNPJ inválido. Digite 14 números." });
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
      if (!res.ok) {
        setMsg({
          type: "err",
          text: "Não consegui buscar esse CNPJ na BrasilAPI. Verifique e tente novamente.",
        });
        return;
      }

      const data = (await res.json()) as BrasilApiCnpj;

      const legal = data.razao_social || "";
      const fantasy = data.nome_fantasia || "";
      const displayName = fantasy || legal;

      const addrParts = [
        [data.descricao_tipo_de_logradouro, data.logradouro].filter(Boolean).join(" "),
        data.numero,
        data.complemento,
        data.bairro,
        [data.municipio, data.uf].filter(Boolean).join(" - "),
        data.cep ? `CEP: ${data.cep}` : null,
      ].filter(Boolean);

      const addressLine = addrParts.join(", ");
      const cityUf = [data.municipio, data.uf].filter(Boolean).join(" – ");

      const pickedPhone = data.ddd_telefone_1 || data.ddd_telefone_2 || phone || "";
      const suggestedSlug = slug ? slugify(slug) : slugify(displayName);

      setSlug(suggestedSlug);
      setCompanyName(displayName);
      setPhone(pickedPhone);

      // ✅ whatsapp copia do telefone (só dígitos ou como veio)
      setWhatsapp(pickedPhone);

      // ✅ email sempre contato@slug.com
      setEmail(defaultCompanyEmailFromSlug(suggestedSlug));

      // ✅ defaults sociais
      setInstagram("instagram.com");
      setFacebook("facebook.com");

      const companyLegalName = legal || displayName || "Empresa";

      setMission((prev) => (prev?.trim() ? prev : makeMission(companyLegalName)));

      setAbout(
        makeAbout({
          companyLegalName,
          cnpj: data.cnpj || clean,
          openedAt: data.data_inicio_atividade,
          cityUf: cityUf || "—",
          addressLine: addressLine || "—",
          activityDesc: data.cnae_fiscal_descricao,
        })
      );

      setPrivacy(
        makePrivacy({
          companyLegalName,
          cnpj: data.cnpj || clean,
          addressLine: addressLine || "—",
          email: defaultCompanyEmailFromSlug(suggestedSlug) || "—",
          phone: pickedPhone || "—",
        })
      );

      setFooter(
        makeFooter({
          companyLegalName,
          cnpj: data.cnpj || clean,
          openedAt: data.data_inicio_atividade,
          status: data.descricao_situacao_cadastral,
          capital: data.capital_social,
          addressLine: addressLine || "—",
          email: defaultCompanyEmailFromSlug(suggestedSlug) || "—",
          phone: pickedPhone || "—",
        })
      );

      setMsg({ type: "ok", text: "Dados gerados e preenchidos ✅" });
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message || "Erro ao gerar dados." });
    } finally {
      setGenerating(false);
    }
  }

  async function handleCreate() {
    setMsg(null);

    const cleanCnpj = onlyDigits(cnpj);
    if (cleanCnpj.length !== 14) {
      setMsg({ type: "err", text: "CNPJ inválido. Digite 14 números." });
      return;
    }

    const cleanSlug = slugify(slug);
    if (!cleanSlug) {
      setMsg({ type: "err", text: "Slug inválido." });
      return;
    }

    if (!companyName.trim()) {
      setMsg({ type: "err", text: "Preencha o nome da empresa." });
      return;
    }

    // ✅ meta tag (opcional)
    const metaParsed = parseMetaTag(metaTagRaw);
    if (metaTagRaw.trim() && !metaParsed.content) {
      setMsg({
        type: "err",
        text: "Meta tag inválida. Cole o código de verificação ou a meta tag completa com content.",
      });
      return;
    }

    setCreating(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) {
        router.push("/login");
        return;
      }

      const { error } = await supabase.from("sites").insert({
        user_id: user.id,
        slug: cleanSlug,
        company_name: companyName.trim(),
        cnpj: cleanCnpj,

        phone: phone || null,
        email: email || null,

        // ✅ novos campos
        whatsapp: whatsapp || phone || null,
        instagram: instagram || "instagram.com",
        facebook: facebook || "facebook.com",
        meta_verify_name: metaParsed.name,
        meta_verify_content: metaParsed.content,

        mission: mission || null,
        about: about || null,
        privacy: privacy || null,
        footer: footer || null,
        is_public: !!isPublic,
      });

      if (error) {
        setMsg({ type: "err", text: error.message });
        return;
      }

      setMsg({ type: "ok", text: "Site criado com sucesso ✅" });
      router.push("/sites");
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message || "Erro ao criar site." });
    } finally {
      setCreating(false);
    }
  }

  const publicUrl = useMemo(() => buildPublicUrl(slugify(slug)), [slug]);

  return (
    <div className="max-w-4xl text-white">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Criar Site</h1>
      </div>

      {msg && (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            msg.type === "ok"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
              : "border-red-500/20 bg-red-500/10 text-red-200"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="mt-6 space-y-6 rounded-2xl border border-white/10 bg-white/5 p-5">
        {/* CNPJ + Gerar */}
        <div className="grid gap-3 md:grid-cols-3 md:items-end">
          <div className="md:col-span-2">
            <label className="text-sm text-white/80">CNPJ *</label>
            <input
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="00.000.000/0000-00"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-violet-400"
            />
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || loadingUser}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
          >
            {generating ? "Gerando..." : "Gerar dados"}
          </button>
        </div>

        {/* Slug + Público */}
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm text-white/80">Slug *</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="ex: movy-digital"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-violet-400"
            />
            <div className="mt-2 text-xs text-white/50">
              URL pública: <span className="text-white/80">{publicUrl}</span>
            </div>
          </div>

          <div className="flex items-end gap-3">
            <label className="flex items-center gap-2 text-sm text-white/80">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
              Deixar site público
            </label>
          </div>
        </div>

        {/* Básicos */}
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm text-white/80">Nome da Empresa *</label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-violet-400"
            />
          </div>

          <div>
            <label className="text-sm text-white/80">E-mail (padrão)</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contato@nomedaempresa.com"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-violet-400"
            />
          </div>

          <div>
            <label className="text-sm text-white/80">Telefone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-violet-400"
            />
          </div>

          <div>
            <label className="text-sm text-white/80">WhatsApp (copia do telefone)</label>
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-violet-400"
            />
          </div>

          <div>
            <label className="text-sm text-white/80">Instagram</label>
            <input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="instagram.com"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-violet-400"
            />
          </div>

          <div>
            <label className="text-sm text-white/80">Facebook</label>
            <input
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              placeholder="facebook.com"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-violet-400"
            />
          </div>
        </div>

        {/* Meta tag */}
        <div>
          <label className="text-sm text-white/80">
            Meta tag de verificação (Facebook BM) — opcional
          </label>
          <textarea
            value={metaTagRaw}
            onChange={(e) => setMetaTagRaw(e.target.value)}
            placeholder='Cole a META TAG completa: <meta name="facebook-domain-verification" content="abc123" />'
            rows={3}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-violet-400"
          />
          <div className="mt-2 text-xs text-white/50">
            Depois que você verificar o domíno no Business Manager.{" "}
            <span className="text-white/70">Volte aqui e cole e salve</span>.
          </div>
        </div>

        {/* Textos */}
        <div className="space-y-3">
          <div>
            <label className="text-sm text-white/80">Nossa missão</label>
            <textarea
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              rows={6}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-violet-400"
            />
          </div>

          <div>
            <label className="text-sm text-white/80">Sobre nós</label>
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              rows={10}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-violet-400"
            />
          </div>

          <div>
            <label className="text-sm text-white/80">Política de privacidade</label>
            <textarea
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value)}
              rows={10}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-violet-400"
            />
          </div>

          <div>
            <label className="text-sm text-white/80">Rodapé</label>
            <textarea
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-violet-400"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || loadingUser}
            className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {creating ? "Criando..." : "Criar Site"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/sites")}
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}
