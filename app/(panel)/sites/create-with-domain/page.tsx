"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

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
    return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4, 8)}`;
  }

  const r = digits.slice(2, 11);
  return `(${ddd}) ${r.slice(0, 5)}-${r.slice(5, 9)}`;
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

  return {
    name: nameMatch?.[1] ?? "facebook-domain-verification",
    content: contentMatch?.[1] ?? null,
  };
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

function makeAbout(opts: any) {
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

function makePrivacy(opts: any) {
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

Não comercializamos dados pessoais.

5. Direitos do Titular (LGPD)

Nos termos da LGPD, o titular pode solicitar acesso, correção, atualização, bloqueio ou eliminação de dados.

6. Armazenamento e Segurança

Adotamos medidas técnicas e administrativas adequadas para proteger os dados pessoais.

7. Alterações

Esta política pode ser atualizada periodicamente.

8. Contato

📧 E-mail: ${email}${telefone ? `\n📞 Telefone: ${telefone}` : ""}

${razao}
CNPJ ${cnpj}
©️ ${new Date().getFullYear()} ${razao}. Todos os direitos reservados.`;
}

function makeFooter(opts: any) {
  const { razao, cnpj, abertura, porte, natureza, situacao, tipo, capital, endereco, cep, email, telefone } = opts;

  return `${razao} CNPJ: ${cnpj} | Data de Abertura: ${abertura ? fmtDateBR(abertura) : "-"} | Porte: ${
    porte || "-"
  } | Natureza Jurídica: ${natureza || "-"} | Situação Cadastral: ${situacao || "-"} | Tipo: ${
    tipo || "-"
  } | Capital Social: ${capital || "-"} | Endereço: ${endereco || "-"} | CEP: ${cep || "-"} | Contato: 📧 ${
    email || "-"
  } 📞 ${telefone || "-"} | ©️ ${new Date().getFullYear()} ${razao}. Todos os direitos reservados.`;
}

type DomainRow = {
  id: string;
  domain: string;
};

type BalanceRow = {
  balance: number | null;
};

const initialForm = {
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
};

export default function CreateSiteWithDomainPage() {
  const router = useRouter();

  const [form, setForm] = useState(initialForm);
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");

  const [loading, setLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setBalanceLoading(true);

      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: bal } = await supabase
        .from("domain_coin_balances")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle<BalanceRow>();

      setBalance(bal?.balance ?? 0);

      const { data: domainData, error } = await supabase
        .from("available_domains")
        .select("id, domain")
        .eq("assigned_user_id", user.id)
        .eq("status", "sold")
        .is("assigned_site_id", null)
        .order("assigned_at", { ascending: false });

      if (error) {
        setMsg(error.message);
        setDomains([]);
      } else {
        setDomains(domainData || []);
      }

      setBalanceLoading(false);
    }

    load();
  }, [router]);

  async function generateFromCnpj() {
    setMsg(null);

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

      const razao = data.razao_social || data.razao || "";
      const fantasia = data.nome_fantasia || data.fantasia || "";
      const abertura = data.data_inicio_atividade || data.data_abertura || null;

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
          : "";

      const phone = formatBRPhone(String(phoneRaw || "").trim());
      const email = buildEmailFromCompany(razao || fantasia || "empresa");

      const porte = data.porte || "";
      const natureza = data.natureza_juridica || data.natureza || "";
      const situacao = data.descricao_situacao_cadastral || data.situacao_cadastral || "";
      const tipo = data.descricao_identificador_matriz_filial || data.tipo || "";
      const capital = data.capital_social || data.capital || "";
      const cnaePrincipal =
        data.cnae_fiscal_descricao || (data.cnae_fiscal ? `CNAE ${data.cnae_fiscal}` : "") || "";

      const formattedCnpj = formatCNPJ(String(data.cnpj || cnpjDigits));
      const company = razao || fantasia || "Empresa";

      setForm((prev) => ({
        ...prev,
        cnpj: formattedCnpj,
        company_name: company,
        fantasy_name: fantasia || prev.fantasy_name,
        phone: phone || prev.phone,
        whatsapp: phone || prev.whatsapp,
        email,
        instagram: prev.instagram || "https://instagram.com",
        facebook: prev.facebook || "https://facebook.com",
        mission: makeMission(company),
        about: makeAbout({
          razao: company,
          fantasia: fantasia || null,
          cnpj: formattedCnpj,
          abertura,
          cidade: municipio || null,
          uf: uf || null,
          porte: porte || null,
          natureza: natureza || null,
          cnae: cnaePrincipal || null,
          endereco: enderecoFull || null,
        }),
        privacy: makePrivacy({
          razao: company,
          cnpj: formattedCnpj,
          endereco: enderecoFull || null,
          email,
          telefone: phone || null,
        }),
        footer: makeFooter({
          razao: company,
          cnpj: formattedCnpj,
          abertura,
          porte,
          natureza,
          situacao,
          tipo,
          capital,
          endereco: enderecoFull,
          cep,
          email,
          telefone: phone,
        }),
      }));
    } catch (e: any) {
      setMsg(e?.message || "Erro ao gerar dados do CNPJ.");
    } finally {
      setGenLoading(false);
    }
  }

  async function handleCreate() {
    setMsg(null);

    const { data: auth } = await supabase.auth.getSession();
    const token = auth.session?.access_token;

    if (!token) {
      setMsg("Você precisa estar logado para criar um site.");
      router.push("/login");
      return;
    }

    if (!selectedDomainId || !selectedDomain) {
      setMsg("Selecione um domínio comprado.");
      return;
    }

    const cnpjDigits = onlyDigits(form.cnpj);
    if (!cnpjDigits || cnpjDigits.length < 14) return setMsg("Informe um CNPJ válido.");
    if (!form.company_name.trim()) return setMsg("Razão Social é obrigatória.");

    setLoading(true);

    try {
      const { name: meta_verify_name, content: meta_verify_content } = parseMetaTag(form.meta_tag);

      const phoneFmt = formatBRPhone(form.phone);
      const whatsappFmt = formatBRPhone(form.whatsapp);

      const res = await fetch("/api/sites/create-with-domain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          domainId: selectedDomainId,
          domain: selectedDomain,
          company_name: form.company_name.trim(),
          cnpj: cnpjDigits,
          phone: phoneFmt || null,
          email: form.email.trim() || null,
          instagram: form.instagram.trim() || null,
          whatsapp: whatsappFmt || null,
          mission: form.mission.trim() || null,
          about: form.about.trim() || null,
          privacy: form.privacy.trim() || null,
          footer: form.footer.trim() || null,
          meta_verify_name,
          meta_verify_content,
          is_public: form.is_public,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        setMsg(json?.error || "Erro ao criar site com domínio.");
        return;
      }

      router.push("/sites");
    } catch (e: any) {
      setMsg(e?.message || "Erro ao criar site.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Criar Site com Domínio</h1>
          <p className="mt-1 text-sm text-white/60">
            Escolha um domínio comprado e use <b>Gerar dados</b> para autopreencher via CNPJ.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
          <div className="text-white/70">Coins</div>
          <div className="text-lg font-bold">{balanceLoading ? "—" : balance ?? 0}</div>
        </div>
      </div>

      {msg && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {msg}
        </div>
      )}

      <div className="mt-6 space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div>
            <label className="text-xs text-white/70">Domínio comprado *</label>
            <select
              value={selectedDomainId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedDomainId(id);
                const found = domains.find((d) => d.id === id);
                setSelectedDomain(found?.domain || "");
              }}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-white outline-none focus:border-violet-400"
            >
              <option className="bg-slate-900" value="">
                Selecione um domínio
              </option>
              {domains.map((d) => (
                <option className="bg-slate-900" key={d.id} value={d.id}>
                  {d.domain}
                </option>
              ))}
            </select>

            {selectedDomain ? (
              <div className="mt-1 text-[11px] text-white/50">
                URL: https://<b>{selectedDomain}</b>
              </div>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3 md:items-end">
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

            <div>
              <label className="text-xs text-white/70">E-mail</label>
              <input
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="contato@empresa.com"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-violet-400"
              />
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
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
            Cole aqui a <b>meta tag completa</b> após criar o domínio na BM.
          </div>
          <textarea
            value={form.meta_tag}
            onChange={(e) => setForm((p) => ({ ...p, meta_tag: e.target.value }))}
            rows={3}
            className="mt-3 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-white outline-none focus:border-violet-400"
            placeholder='Ex: <meta name="facebook-domain-verification" content="xxxxx" /> ou apenas xxxxx'
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <TextAreaField title="Nossa missão" value={form.mission} onChange={(v) => setForm((p) => ({ ...p, mission: v }))} />
            <TextAreaField title="Sobre nós" value={form.about} onChange={(v) => setForm((p) => ({ ...p, about: v }))} />
            <TextAreaField title="Política de privacidade" value={form.privacy} onChange={(v) => setForm((p) => ({ ...p, privacy: v }))} />
            <TextAreaField title="Rodapé" value={form.footer} onChange={(v) => setForm((p) => ({ ...p, footer: v }))} />
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
            {loading ? "Criando..." : "Criar site com domínio"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TextAreaField({
  title,
  value,
  onChange,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="text-sm font-semibold">{title}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        className="mt-3 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-violet-400"
      />
    </div>
  );
}
