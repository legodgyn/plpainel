"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { makeCompanyAbout, makeCompanyMission } from "@/lib/companyTexts";

const CUSTOM_DOMAIN_IP = "187.77.33.45";
const PANEL_MAIL_HOST = "mail.plpainel.com";
const DRAFT_KEY = "plpainel:custom-domain-draft";
const DRAFT_VERSION = 1;

type BalanceRow = { balance: number | null };

type FormState = {
  domain: string;
  cnpj: string;
  company_name: string;
  phone: string;
  whatsapp: string;
  email: string;
  instagram: string;
  facebook: string;
  mission: string;
  about: string;
  privacy: string;
  footer: string;
};

type WizardDraft = {
  version: number;
  step: number;
  form: FormState;
  siteId: string | null;
  dnsOk: boolean;
  sslOk: boolean;
  emailOk: boolean;
  dnsDetails: string | null;
  sslDetails: string | null;
  emailDetails: string | null;
  updatedAt: string;
};

const steps = ["Tokens", "CNPJ", "Gerar Site", "Domínio + DNS", "Email", "Concluído"];

const initialForm: FormState = {
  domain: "",
  cnpj: "",
  company_name: "",
  phone: "",
  whatsapp: "",
  email: "",
  instagram: "https://instagram.com",
  facebook: "https://facebook.com",
  mission: "",
  about: "",
  privacy: "",
  footer: "",
};

function onlyDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function cleanDomain(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split(":")[0];
}

function isValidDomain(domain: string) {
  return /^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/.test(domain);
}

function formatCNPJ(input: string) {
  const digits = onlyDigits(input).slice(0, 14);
  if (!digits) return "";

  let out = digits.slice(0, 2);
  if (digits.length >= 3) out += `.${digits.slice(2, 5)}`;
  if (digits.length >= 6) out += `.${digits.slice(5, 8)}`;
  if (digits.length >= 9) out += `/${digits.slice(8, 12)}`;
  if (digits.length >= 13) out += `-${digits.slice(12, 14)}`;

  return out;
}

function formatBRPhone(input: string) {
  let digits = onlyDigits(input);
  if (!digits) return "";
  if (digits.length > 11) digits = digits.slice(-11);

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);

  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${ddd}) ${rest}`;
  if (digits.length === 10) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4, 8)}`;

  const mobile = digits.slice(2, 11);
  return `(${ddd}) ${mobile.slice(0, 5)}-${mobile.slice(5, 9)}`;
}

function buildEmail(domain: string) {
  return domain ? `contato@${domain}` : "contato@seudominio.com.br";
}

function fmtDateBR(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return iso || "";
  }
}

function makeMission(company: string) {
  return `A missão da ${company} é desenvolver estratégias eficientes, orientadas a resultados, que fortaleçam a presença da marca e ampliem oportunidades de negócio.`;
}

function makeAbout(opts: {
  company: string;
  cnpj: string;
  abertura?: string | null;
  cidade?: string | null;
  uf?: string | null;
  endereco?: string | null;
}) {
  return `QUEM SOMOS?

A ${opts.company}, registrada sob o CNPJ ${opts.cnpj}${opts.abertura ? `, foi fundada em ${fmtDateBR(opts.abertura)}` : ""}${
    opts.cidade || opts.uf ? `, na cidade de ${opts.cidade || "-"}${opts.uf ? `/${opts.uf}` : ""}` : ""
  }.

Atuamos com atendimento responsável, comunicação clara e foco em resultados. ${
    opts.endereco ? `Nosso endereço cadastral é ${opts.endereco}.` : ""
  }`;
}

function makePrivacy(company: string, cnpj: string, email: string, phone?: string) {
  return `POLÍTICA DE PRIVACIDADE

${company}
CNPJ: ${cnpj}

Coletamos apenas dados necessários para atendimento, comunicação e execução dos serviços. Não comercializamos dados pessoais. O titular pode solicitar acesso, correção ou exclusão dos seus dados pelos canais oficiais.

Contato: ${email}${phone ? ` | ${phone}` : ""}

${company} - Todos os direitos reservados.`;
}

function makeFooter(company: string, cnpj: string, email: string, phone?: string) {
  return `${company} | CNPJ: ${cnpj} | Contato: ${email}${phone ? ` | ${phone}` : ""} | ${new Date().getFullYear()} Todos os direitos reservados.`;
}

function safeStep(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(6, Math.max(1, Math.round(n)));
}

function formatDraftDate(value?: string) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function readDraft() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;

    const draft = JSON.parse(raw) as Partial<WizardDraft>;

    if (draft.version !== DRAFT_VERSION || !draft.form) return null;

    return {
      version: DRAFT_VERSION,
      step: safeStep(draft.step),
      form: { ...initialForm, ...draft.form },
      siteId: draft.siteId || null,
      dnsOk: Boolean(draft.dnsOk),
      sslOk: Boolean(draft.sslOk),
      emailOk: Boolean(draft.emailOk),
      dnsDetails: draft.dnsDetails || null,
      sslDetails: draft.sslDetails || null,
      emailDetails: draft.emailDetails || null,
      updatedAt: draft.updatedAt || new Date().toISOString(),
    } satisfies WizardDraft;
  } catch {
    return null;
  }
}

function writeDraft(draft: WizardDraft) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

function clearDraft() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DRAFT_KEY);
}

function Progress({ current }: { current: number }) {
  return (
    <div className="mt-8 grid grid-cols-6 gap-2">
      {steps.map((label, index) => {
        const n = index + 1;
        const done = n < current;
        const active = n === current;

        return (
          <div key={label} className="relative flex flex-col items-center gap-2">
            {index > 0 ? (
              <div
                className={`absolute right-1/2 top-4 h-0.5 w-full ${
                  done || active ? "bg-[var(--panel-green)]" : "bg-[var(--panel-line)]"
                }`}
              />
            ) : null}
            <div
              className={`relative z-10 grid h-9 w-9 place-items-center rounded-full text-sm font-bold ${
                done
                  ? "bg-[var(--panel-green)] text-white"
                  : active
                  ? "bg-[var(--panel-ink)] text-[var(--panel-bg)]"
                  : "bg-[var(--panel-hover)] text-[var(--panel-muted)]"
              }`}
            >
              {done ? "✓" : n}
            </div>
            <div className={`text-center text-[11px] ${active ? "font-black text-[var(--panel-ink)]" : "font-semibold text-[var(--panel-muted)]"}`}>
              {label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DnsRow({
  type,
  name,
  value,
  extra,
}: {
  type: string;
  name: string;
  value: string;
  extra?: string;
}) {
  return (
    <div className="grid gap-3 rounded-2xl border border-[var(--panel-line)] bg-[var(--panel-surface)] p-4 text-sm md:grid-cols-[.6fr_.8fr_1.6fr_.8fr]">
      <div>
        <div className="text-[10px] font-black uppercase text-[var(--panel-muted)]">Tipo</div>
        <div className="mt-1 font-black text-[var(--panel-ink)]">{type}</div>
      </div>
      <div>
        <div className="text-[10px] font-black uppercase text-[var(--panel-muted)]">Nome</div>
        <div className="mt-1 font-semibold text-[var(--panel-ink)]">{name}</div>
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-black uppercase text-[var(--panel-muted)]">Valor</div>
        <div className="mt-1 break-all font-black text-[var(--panel-green-2)]">{value}</div>
      </div>
      <div>
        <div className="text-[10px] font-black uppercase text-[var(--panel-muted)]">{extra ? "Obs." : "TTL"}</div>
        <div className="mt-1 font-semibold text-[var(--panel-muted)]">{extra || "Auto"}</div>
      </div>
    </div>
  );
}

export default function CustomDomainWizardPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [form, setForm] = useState<FormState>(initialForm);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [dnsOk, setDnsOk] = useState(false);
  const [sslOk, setSslOk] = useState(false);
  const [emailOk, setEmailOk] = useState(false);
  const [dnsDetails, setDnsDetails] = useState<string | null>(null);
  const [sslDetails, setSslDetails] = useState<string | null>(null);
  const [emailDetails, setEmailDetails] = useState<string | null>(null);
  const [savedDraft, setSavedDraft] = useState<WizardDraft | null>(null);
  const [draftChecked, setDraftChecked] = useState(false);
  const [draftActive, setDraftActive] = useState(false);

  const domain = useMemo(() => cleanDomain(form.domain), [form.domain]);
  const contactEmail = useMemo(() => buildEmail(domain), [domain]);

  useEffect(() => {
    let alive = true;

    async function loadBalance() {
      setLoadingBalance(true);
      const { data: auth } = await supabase.auth.getUser();

      if (!auth.user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("user_token_balances")
        .select("balance")
        .eq("user_id", auth.user.id)
        .maybeSingle<BalanceRow>();

      if (!alive) return;
      setBalance(data?.balance ?? 0);
      setLoadingBalance(false);
    }

    loadBalance();

    return () => {
      alive = false;
    };
  }, [router]);

  function resetWizard(nextStep = 1) {
    clearDraft();
    setSavedDraft(null);
    setDraftActive(true);
    setStep(nextStep);
    setForm(initialForm);
    setMsg(null);
    setSiteId(null);
    setDnsOk(false);
    setSslOk(false);
    setEmailOk(false);
    setDnsDetails(null);
    setSslDetails(null);
    setEmailDetails(null);
  }

  function restoreDraft(draft: WizardDraft) {
    setForm(draft.form);
    setStep(draft.step);
    setSiteId(draft.siteId);
    setDnsOk(draft.dnsOk);
    setSslOk(draft.sslOk);
    setEmailOk(draft.emailOk);
    setDnsDetails(draft.dnsDetails);
    setSslDetails(draft.sslDetails);
    setEmailDetails(draft.emailDetails);
    setMsg(null);
    setDraftActive(true);
  }

  useEffect(() => {
    const draft = readDraft();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedDraft(draft);
    if (draft) {
      restoreDraft(draft);
    }
    setDraftChecked(true);
  }, []);

  useEffect(() => {
    if (!draftChecked || !draftActive) return;

    const nextDraft = {
      version: DRAFT_VERSION,
      step,
      form,
      siteId,
      dnsOk,
      sslOk,
      emailOk,
      dnsDetails,
      sslDetails,
      emailDetails,
      updatedAt: new Date().toISOString(),
    } satisfies WizardDraft;

    writeDraft(nextDraft);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedDraft(nextDraft);
  }, [
    draftChecked,
    draftActive,
    step,
    form,
    siteId,
    dnsOk,
    sslOk,
    emailOk,
    dnsDetails,
    sslDetails,
    emailDetails,
  ]);

  async function fetchCnpj() {
    setMsg(null);
    const digits = onlyDigits(form.cnpj);

    if (digits.length !== 14) {
      setMsg("Digite um CNPJ válido.");
      return;
    }

    if (!isValidDomain(domain)) {
      setMsg("Digite um domínio válido.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
        cache: "no-store",
      });

      if (!res.ok) throw new Error("Não foi possível buscar esse CNPJ.");

      const data = await res.json();
      const company = data.razao_social || data.razao || data.nome_fantasia || "Empresa";
      const fantasyName = data.nome_fantasia || data.fantasia || null;
      const phone = formatBRPhone(String(data.ddd_telefone_1 || data.telefone || ""));
      const formattedCnpj = formatCNPJ(String(data.cnpj || digits));
      const address = [
        data.logradouro,
        data.numero ? `, ${data.numero}` : "",
        data.bairro ? ` - ${data.bairro}` : "",
        data.municipio ? `, ${data.municipio}` : "",
        data.uf ? `/${data.uf}` : "",
      ]
        .join("")
        .trim();
      const cnaePrincipal =
        data.cnae_fiscal_descricao || (data.cnae_fiscal ? `CNAE ${data.cnae_fiscal}` : "") || "";
      const companyTextInput = {
        legalName: company,
        fantasyName,
        cnpj: formattedCnpj,
        openedAt: data.data_inicio_atividade || data.data_abertura || null,
        city: data.municipio || data.cidade || null,
        state: data.uf || null,
        size: data.porte || null,
        legalNature: data.natureza_juridica || data.natureza || null,
        mainActivity: cnaePrincipal || null,
        address: address || null,
      };

      setForm((prev) => ({
        ...prev,
        cnpj: formattedCnpj,
        company_name: company,
        phone,
        whatsapp: phone,
        email: contactEmail,
        mission: makeCompanyMission(companyTextInput),
        about: makeCompanyAbout(companyTextInput),
        privacy: makePrivacy(company, formattedCnpj, contactEmail, phone),
        footer: makeFooter(company, formattedCnpj, contactEmail, phone),
      }));

      setStep(3);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Erro ao buscar CNPJ.");
    } finally {
      setLoading(false);
    }
  }

  async function createSite() {
    setMsg(null);

    if (!isValidDomain(domain)) {
      setMsg("Informe um domínio válido antes de criar o site.");
      setStep(2);
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/sites/create-custom-domain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          domain,
          email: form.email || contactEmail,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        setMsg(json.error || "Erro ao criar site.");
        return;
      }

      setSiteId(json.siteId);
      setBalance((prev) => (typeof prev === "number" ? Math.max(0, prev - 1) : prev));
      setStep(4);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Erro ao criar site.");
    } finally {
      setLoading(false);
    }
  }

  async function setupSslFromDnsCheck() {
    setMsg(null);
    setDnsDetails(null);
    setSslDetails(null);
    setLoading(true);

    try {
      const res = await fetch("/api/dns/check-a", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const json = await res.json().catch(() => ({}));

      const ok = Boolean(json.ok);
      setDnsOk(ok);
      if (!ok) {
        setSslOk(false);
        setSslDetails(null);
        setDnsDetails(
          `Encontrado: ${(json.records || []).join(", ") || "nenhum registro A"}`
        );
        return;
      }

      setDnsDetails("Domínio apontando corretamente. Configurando SSL...");

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        router.push("/login");
        return;
      }

      const sslRes = await fetch("/api/dns/setup-ssl", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ domain, email: form.email || contactEmail }),
      });
      const sslJson = await sslRes.json().catch(() => ({}));

      setSslOk(Boolean(sslJson.sslOk));
      setSslDetails(
        sslJson.sslOk
          ? "SSL instalado e HTTPS ativo."
          : sslJson.message ||
              "DNS ok, mas nao foi possivel ativar o SSL agora."
      );

      if (!sslRes.ok || !sslJson.ok) {
        setMsg(sslJson.message || "Nao foi possivel ativar o SSL agora. Tente novamente em alguns minutos.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function checkPanelInbox() {
    setMsg(null);
    setEmailDetails(null);
    setLoading(true);

    try {
      const res = await fetch("/api/dns/check-plpainel-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const json = await res.json().catch(() => ({}));

      setEmailOk(Boolean(json.ok));
      setEmailDetails(
        json.ok
          ? "Caixa de entrada configurada corretamente."
          : `Faltando MX: ${(json.missing?.mx || []).join(", ") || "ok"} | SPF: ${
              (json.missing?.spf || []).length ? "pendente" : "ok"
            }`
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="pl-page max-w-7xl space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[var(--panel-line)] bg-[var(--panel-icon-bg)] text-[var(--panel-green-2)]">
            ◇
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-[var(--panel-ink)]">Dominio Proprio Guiado</h1>
              <span className="pl-badge pl-badge-ok">
                NOVO
              </span>
              {draftActive ? (
                <span className="pl-badge">
                  RASCUNHO SALVO
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm font-semibold text-[var(--panel-muted)]">
              Crie um site com domínio próprio, SSL e caixa de entrada no PLPainel.
            </p>
          </div>
        </div>

        <Progress current={step} />
      </div>

      {msg ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {msg}
        </div>
      ) : null}

      {draftActive ? (
        <div className="flex flex-col gap-3 rounded-[28px] border border-[var(--panel-ok-line)] bg-[var(--panel-ok-bg)] px-4 py-3 text-sm font-semibold text-[var(--panel-ok-text)] md:flex-row md:items-center md:justify-between">
          <div>
            <b>Criação em andamento salva.</b>{" "}
            {domain ? (
              <span>
                Retomamos o domínio <b>{domain}</b>
              </span>
            ) : (
              <span>Retomamos de onde você parou.</span>
            )}
            {savedDraft?.updatedAt ? <span> | Salvo em {formatDraftDate(savedDraft.updatedAt)}</span> : null}
          </div>
          <button
            type="button"
            onClick={() => resetWizard(2)}
            className="pl-btn"
          >
            Criar novo
          </button>
        </div>
      ) : null}

      <section className="pl-card">
        {step === 1 ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">Verificação de Tokens</h2>
              <p className="mt-2 text-sm text-[var(--panel-muted)]">A geração de site com domínio próprio custa 1 token.</p>
            </div>

            <div className="pl-card-soft p-8 text-center">
              <div className="text-sm text-[var(--panel-muted)]">Seu saldo atual</div>
              <div className="mt-2 text-5xl font-black text-[var(--panel-green-2)]">
                {loadingBalance ? "..." : balance ?? 0}
              </div>
              <div className="mt-1 text-sm text-[var(--panel-muted)]">tokens</div>
            </div>

            <button
              onClick={() => {
                setDraftActive(true);
                setStep(2);
              }}
              disabled={loadingBalance || !balance || balance < 1}
              className="pl-btn pl-btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
            >
              Começar
            </button>

            {!loadingBalance && (!balance || balance < 1) ? (
              <Link
                href="/tokens"
                className="pl-btn block text-center"
              >
                Comprar tokens
              </Link>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-[var(--panel-ink)]">Buscar Empresa pelo CNPJ</h2>
              <p className="mt-2 text-sm font-semibold text-[var(--panel-muted)]">
                Informe o CNPJ e o domínio que o cliente já comprou.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <label className="block">
                <span className="pl-label">CNPJ</span>
                <input
                  value={form.cnpj}
                  onChange={(e) => setForm((prev) => ({ ...prev, cnpj: formatCNPJ(e.target.value) }))}
                  placeholder="00.000.000/0000-00"
                  className="pl-input mt-2"
                />
              </label>

              <label className="block">
                <span className="pl-label">Dominio proprio</span>
                <input
                  value={form.domain}
                  onChange={(e) => {
                    const nextDomain = cleanDomain(e.target.value);
                    setDnsOk(false);
                    setSslOk(false);
                    setEmailOk(false);
                    setDnsDetails(null);
                    setSslDetails(null);
                    setEmailDetails(null);
                    setForm((prev) => ({
                      ...prev,
                      domain: nextDomain,
                      email: prev.email && prev.email !== contactEmail ? prev.email : buildEmail(nextDomain),
                    }));
                  }}
                  placeholder="seudominio.com.br"
                  className="pl-input mt-2"
                />
              </label>

              <button
                onClick={fetchCnpj}
                disabled={loading}
                className="pl-btn pl-btn-primary justify-center px-6"
              >
                {loading ? "Buscando..." : "Buscar"}
              </button>
            </div>

            <button onClick={() => setStep(1)} className="text-sm font-semibold text-[var(--panel-muted)] hover:text-[var(--panel-ink)]">
              ← Voltar
            </button>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-[var(--panel-ink)]">Gerar Site com IA</h2>
              <p className="mt-2 text-sm font-semibold text-[var(--panel-muted)]">
                Revise os dados antes de criar o site. Depois você configura o DNS.
              </p>
            </div>

            <div className="pl-card-soft">
              <div className="font-black text-[var(--panel-ink)]">{form.company_name || "Empresa"}</div>
              <div className="mt-1 text-sm font-semibold text-[var(--panel-muted)]">{domain || "seudominio.com.br"}</div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <input
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: formatBRPhone(e.target.value) }))}
                  placeholder="Telefone"
                  className="pl-input"
                />
                <input
                  value={form.whatsapp}
                  onChange={(e) => setForm((prev) => ({ ...prev, whatsapp: formatBRPhone(e.target.value) }))}
                  placeholder="WhatsApp"
                  className="pl-input"
                />
                <input
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder={contactEmail}
                  className="pl-input md:col-span-2"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <button
                onClick={() => setStep(2)}
                className="pl-btn"
              >
                Voltar
              </button>
              <button
                onClick={createSite}
                disabled={loading}
                className="pl-btn pl-btn-primary flex-1 justify-center"
              >
                {loading ? "Criando..." : "Gerar e Criar Site (1 token)"}
              </button>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-[var(--panel-ink)]">Conectar Dominio Proprio</h2>
              <p className="mt-2 text-sm font-semibold text-[var(--panel-muted)]">
                No DNS do domínio, crie o registro abaixo apontando para o servidor.
              </p>
            </div>

            <div className="pl-card-soft">
              <div className="mb-4 text-sm font-black text-[var(--panel-ink)]">Registros obrigatorios antes do SSL</div>
              <div className="space-y-3">
                <DnsRow type="A" name="@" value={CUSTOM_DOMAIN_IP} />
                <DnsRow type="A" name="*" value={CUSTOM_DOMAIN_IP} />
              </div>
              <div className="mt-4 rounded-2xl border border-[var(--panel-warn-line)] bg-[var(--panel-warn-bg)] px-4 py-3 text-sm font-semibold text-[var(--panel-warn-text)]">
                Antes de ativar o SSL, o domínio precisa estar com o registro A @ apontando para {CUSTOM_DOMAIN_IP}.
                O registro A * libera a criação de subdomínios depois, como loja.{domain || "seudominio.com"}.
              </div>
              <div className="mt-3 rounded-2xl border border-[var(--panel-line)] bg-[var(--panel-hover)] px-4 py-3 text-sm font-semibold text-[var(--panel-muted)]">
                Se usar Cloudflare, deixe o proxy desligado nesse registro durante a primeira validação: nuvem cinza.
              </div>
            </div>

            {dnsDetails ? (
              <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${dnsOk ? "bg-[var(--panel-ok-bg)] text-[var(--panel-ok-text)]" : "bg-[var(--panel-warn-bg)] text-[var(--panel-warn-text)]"}`}>
                {dnsDetails}
              </div>
            ) : null}

            {sslDetails ? (
              <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${sslOk ? "bg-[var(--panel-ok-bg)] text-[var(--panel-ok-text)]" : "bg-[var(--panel-warn-bg)] text-[var(--panel-warn-text)]"}`}>
                {sslDetails}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 md:flex-row">
              <button
                onClick={setupSslFromDnsCheck}
                disabled={loading}
                className="pl-btn"
              >
                {loading ? "Configurando SSL..." : "Verificar DNS e Instalar SSL"}
              </button>
              <button
                onClick={() => setStep(5)}
                disabled={!sslOk}
                className="pl-btn pl-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continuar para Email
              </button>
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">Ativar Email Interno</h2>
              <p className="mt-2 text-sm text-[var(--panel-muted)]">
                Configure o DNS para receber mensagens do domínio dentro da caixa de entrada do PLPainel.
              </p>
            </div>

            <div className="pl-card-soft p-5">
              <div className="mb-4">
                <div className="text-sm font-bold">Registros obrigatórios no DNS</div>
                <div className="mt-1 text-xs text-[var(--panel-muted)]">
                  Pode ser configurado em qualquer provedor de DNS. Não precisa usar Cloudflare.
                </div>
              </div>
              <div className="space-y-3">
                <DnsRow type="MX" name="@" value={PANEL_MAIL_HOST} extra="Prioridade 10" />
                <DnsRow type="TXT" name="@" value="v=spf1 mx ~all" />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-[var(--panel-ok-line)] bg-[var(--panel-ok-bg)] p-4">
                <div className="text-sm font-bold text-[var(--panel-ok-text)]">1. MX</div>
                <div className="mt-1 text-xs text-[var(--panel-muted)]">
                  Direciona o recebimento para {PANEL_MAIL_HOST}.
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--panel-ok-line)] bg-[var(--panel-ok-bg)] p-4">
                <div className="text-sm font-bold text-[var(--panel-ok-text)]">2. SPF</div>
                <div className="mt-1 text-xs text-[var(--panel-muted)]">
                  Autoriza o servidor de email do PLPainel no domínio.
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--panel-ok-line)] bg-[var(--panel-ok-bg)] p-4">
                <div className="text-sm font-bold text-[var(--panel-ok-text)]">3. Inbox</div>
                <div className="mt-1 text-xs text-[var(--panel-muted)]">
                  As mensagens ficam salvas no painel do cliente.
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--panel-line)] bg-[var(--panel-hover)] px-4 py-4 text-sm text-[var(--panel-muted)]">
              Depois da propagação do DNS, emails enviados para <b>{contactEmail}</b> aparecem em{" "}
              <b>Meus Emails</b> no PLPainel. Esta etapa não cria redirecionamento para Gmail ou Outlook.
            </div>

            {emailDetails ? (
              <div className={`rounded-2xl px-4 py-3 text-sm ${emailOk ? "bg-[var(--panel-ok-bg)] text-[var(--panel-ok-text)]" : "bg-[var(--panel-warn-bg)] text-[var(--panel-warn-text)]"}`}>
                {emailDetails}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 md:flex-row">
              <button
                onClick={checkPanelInbox}
                disabled={loading}
                className="pl-btn disabled:opacity-60"
              >
                {loading ? "Verificando..." : "Verificar e Ativar Caixa"}
              </button>
              <button
                onClick={() => {
                  clearDraft();
                  setSavedDraft(null);
                  setDraftActive(false);
                  setStep(6);
                }}
                disabled={!emailOk}
                className="pl-btn pl-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                Concluir
              </button>
            </div>
          </div>
        ) : null}

        {step === 6 ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">Tudo pronto</h2>
              <p className="mt-2 text-sm text-[var(--panel-muted)]">
                Seu site foi criado. O domínio e o email podem levar alguns minutos para propagar.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <a
                href={`https://${domain}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-[var(--panel-ok-line)] bg-[var(--panel-ok-bg)] p-5 text-[var(--panel-ok-text)] hover:opacity-90"
              >
                <div className="text-sm text-[var(--panel-muted)]">Site</div>
                <div className="mt-1 break-all font-bold">https://{domain}</div>
              </a>
              <Link
                href={`/emails/${encodeURIComponent(domain)}`}
                className="rounded-2xl border border-[var(--panel-line)] bg-[var(--panel-hover)] p-5 text-[var(--panel-ink)] hover:opacity-90"
              >
                <div className="text-sm text-[var(--panel-muted)]">Inbox</div>
                <div className="mt-1 break-all font-bold">{contactEmail}</div>
              </Link>
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <button
                onClick={() => router.push("/sites")}
                className="pl-btn pl-btn-primary"
              >
                Ver meus sites
              </button>
              {siteId ? (
                <button
                  onClick={() => router.push(`/sites/${siteId}/edit`)}
                  className="pl-btn"
                >
                  Editar site
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
