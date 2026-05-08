"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

const CUSTOM_DOMAIN_IP = "187.77.33.45";
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
                  done || active ? "bg-violet-500" : "bg-white/10"
                }`}
              />
            ) : null}
            <div
              className={`relative z-10 grid h-9 w-9 place-items-center rounded-full text-sm font-bold ${
                done
                  ? "bg-emerald-500 text-white"
                  : active
                  ? "bg-violet-600 text-white"
                  : "bg-white/10 text-white/70"
              }`}
            >
              {done ? "✓" : n}
            </div>
            <div className={`text-center text-[11px] ${active ? "font-semibold text-white" : "text-white/45"}`}>
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
    <div className="grid gap-3 rounded-2xl bg-black/20 p-4 text-sm md:grid-cols-[.6fr_.8fr_1.6fr_.8fr]">
      <div>
        <div className="text-[10px] uppercase text-white/40">Tipo</div>
        <div className="mt-1 font-bold text-violet-200">{type}</div>
      </div>
      <div>
        <div className="text-[10px] uppercase text-white/40">Nome</div>
        <div className="mt-1 font-semibold">{name}</div>
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase text-white/40">Valor</div>
        <div className="mt-1 break-all font-semibold text-emerald-200">{value}</div>
      </div>
      <div>
        <div className="text-[10px] uppercase text-white/40">{extra ? "Obs." : "TTL"}</div>
        <div className="mt-1 font-semibold text-white/70">{extra || "Auto"}</div>
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

  useEffect(() => {
    const draft = readDraft();
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

      setForm((prev) => ({
        ...prev,
        cnpj: formattedCnpj,
        company_name: company,
        phone,
        whatsapp: phone,
        email: contactEmail,
        mission: makeMission(company),
        about: makeAbout({
          company,
          cnpj: formattedCnpj,
          abertura: data.data_inicio_atividade || data.data_abertura || null,
          cidade: data.municipio || data.cidade || null,
          uf: data.uf || null,
          endereco: address || null,
        }),
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

  async function checkEmailRouting() {
    setMsg(null);
    setEmailDetails(null);
    setLoading(true);

    try {
      const res = await fetch("/api/dns/check-cloudflare-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const json = await res.json().catch(() => ({}));

      setEmailOk(Boolean(json.ok));
      setEmailDetails(
        json.ok
          ? "Email Routing configurado corretamente."
          : `Faltando MX: ${(json.missingMx || []).join(", ") || "nenhum"} | SPF: ${
              json.hasCloudflareSpf ? "ok" : "pendente"
            }`
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl text-white">
      <div>
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl border border-violet-400/30 bg-violet-500/10 text-violet-200">
            ◇
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black">Domínio Próprio Guiado</h1>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-200">
                NOVO
              </span>
              {draftActive ? (
                <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-xs font-bold text-violet-100">
                  RASCUNHO SALVO
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-white/55">
              Crie um site com domínio próprio, DNS e Cloudflare Email Routing.
            </p>
          </div>
        </div>

        <Progress current={step} />
      </div>

      {msg ? (
        <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {msg}
        </div>
      ) : null}

      {draftActive ? (
        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-100 md:flex-row md:items-center md:justify-between">
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
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
          >
            Criar novo
          </button>
        </div>
      ) : null}

      <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_20px_80px_rgba(0,0,0,.25)]">
        {step === 1 ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">Verificação de Tokens</h2>
              <p className="mt-2 text-sm text-white/55">A geração de site com domínio próprio custa 1 token.</p>
            </div>

            <div className="rounded-3xl border border-violet-500/15 bg-violet-500/10 p-8 text-center">
              <div className="text-sm text-white/55">Seu saldo atual</div>
              <div className="mt-2 text-5xl font-black text-violet-300">
                {loadingBalance ? "..." : balance ?? 0}
              </div>
              <div className="mt-1 text-sm text-white/50">tokens</div>
            </div>

            <button
              onClick={() => {
                setDraftActive(true);
                setStep(2);
              }}
              disabled={loadingBalance || !balance || balance < 1}
              className="w-full rounded-xl bg-emerald-500 px-5 py-4 font-bold text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Começar
            </button>

            {!loadingBalance && (!balance || balance < 1) ? (
              <Link
                href="/tokens"
                className="block rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-3 text-center text-sm font-semibold text-violet-100"
              >
                Comprar tokens
              </Link>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">Buscar Empresa pelo CNPJ</h2>
              <p className="mt-2 text-sm text-white/55">
                Informe o CNPJ e o domínio que o cliente já comprou.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <label className="block">
                <span className="text-xs text-white/50">CNPJ</span>
                <input
                  value={form.cnpj}
                  onChange={(e) => setForm((prev) => ({ ...prev, cnpj: formatCNPJ(e.target.value) }))}
                  placeholder="00.000.000/0000-00"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-violet-400"
                />
              </label>

              <label className="block">
                <span className="text-xs text-white/50">Domínio próprio</span>
                <input
                  value={form.domain}
                  onChange={(e) => {
                    const nextDomain = cleanDomain(e.target.value);
                    setDnsOk(false);
                    setSslOk(false);
                    setDnsDetails(null);
                    setSslDetails(null);
                    setForm((prev) => ({
                      ...prev,
                      domain: nextDomain,
                      email: prev.email && prev.email !== contactEmail ? prev.email : buildEmail(nextDomain),
                    }));
                  }}
                  placeholder="seudominio.com.br"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-violet-400"
                />
              </label>

              <button
                onClick={fetchCnpj}
                disabled={loading}
                className="rounded-xl bg-violet-600 px-6 py-3 font-bold hover:bg-violet-500 disabled:opacity-60"
              >
                {loading ? "Buscando..." : "Buscar"}
              </button>
            </div>

            <button onClick={() => setStep(1)} className="text-sm text-white/60 hover:text-white">
              ← Voltar
            </button>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">Gerar Site com IA</h2>
              <p className="mt-2 text-sm text-white/55">
                Revise os dados antes de criar o site. Depois você configura o DNS.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <div className="font-bold">{form.company_name || "Empresa"}</div>
              <div className="mt-1 text-sm text-white/50">{domain || "seudominio.com.br"}</div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <input
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: formatBRPhone(e.target.value) }))}
                  placeholder="Telefone"
                  className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-violet-400"
                />
                <input
                  value={form.whatsapp}
                  onChange={(e) => setForm((prev) => ({ ...prev, whatsapp: formatBRPhone(e.target.value) }))}
                  placeholder="WhatsApp"
                  className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-violet-400"
                />
                <input
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder={contactEmail}
                  className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-violet-400 md:col-span-2"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <button
                onClick={() => setStep(2)}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white/75 hover:bg-white/10"
              >
                Voltar
              </button>
              <button
                onClick={createSite}
                disabled={loading}
                className="flex-1 rounded-xl bg-violet-600 px-5 py-3 font-bold hover:bg-violet-500 disabled:opacity-60"
              >
                {loading ? "Criando..." : "Gerar e Criar Site (1 token)"}
              </button>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">Conectar Domínio Próprio</h2>
              <p className="mt-2 text-sm text-white/55">
                No DNS do domínio, crie o registro abaixo apontando para o servidor.
              </p>
            </div>

            <div className="rounded-3xl border border-violet-500/15 bg-violet-500/10 p-5">
              <div className="mb-4 text-sm font-bold text-violet-100">Registro obrigatório antes do SSL</div>
              <DnsRow type="A" name="@" value={CUSTOM_DOMAIN_IP} />
              <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                Antes de ativar o SSL, o domínio precisa estar com esse registro A apontando para {CUSTOM_DOMAIN_IP}.
              </div>
              <div className="mt-3 rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
                Se usar Cloudflare, deixe o proxy desligado nesse registro durante a primeira validação: nuvem cinza.
              </div>
            </div>

            {dnsDetails ? (
              <div className={`rounded-2xl px-4 py-3 text-sm ${dnsOk ? "bg-emerald-500/10 text-emerald-100" : "bg-amber-500/10 text-amber-100"}`}>
                {dnsDetails}
              </div>
            ) : null}

            {sslDetails ? (
              <div className={`rounded-2xl px-4 py-3 text-sm ${sslOk ? "bg-emerald-500/10 text-emerald-100" : "bg-amber-500/10 text-amber-100"}`}>
                {sslDetails}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 md:flex-row">
              <button
                onClick={setupSslFromDnsCheck}
                disabled={loading}
                className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-5 py-3 font-semibold text-violet-100 hover:bg-violet-500/15 disabled:opacity-60"
              >
                {loading ? "Configurando SSL..." : "Verificar DNS e Instalar SSL"}
              </button>
              <button
                onClick={() => setStep(5)}
                disabled={!sslOk}
                className="rounded-xl bg-emerald-600 px-5 py-3 font-bold hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continuar para Email
              </button>
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">Configurar Email com Cloudflare</h2>
              <p className="mt-2 text-sm text-white/55">
                Ative o Email Routing na Cloudflare para receber emails como {contactEmail}.
              </p>
            </div>

            <div className="rounded-3xl border border-violet-500/15 bg-violet-500/10 p-5">
              <div className="mb-4 text-sm font-bold">Registros esperados pelo Cloudflare Email Routing</div>
              <div className="space-y-3">
                <DnsRow type="MX" name="@" value="route1.mx.cloudflare.net" extra="Cloudflare define" />
                <DnsRow type="MX" name="@" value="route2.mx.cloudflare.net" extra="Cloudflare define" />
                <DnsRow type="MX" name="@" value="route3.mx.cloudflare.net" extra="Cloudflare define" />
                <DnsRow type="TXT" name="@" value="v=spf1 include:_spf.mx.cloudflare.net ~all" />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-white/65">
              Para cair no painel, crie uma rota no Cloudflare Email Routing apontando para um Email Worker que envie o email para <b>/api/inbound-email</b>.
              O endereço sugerido para verificações é <b>{contactEmail}</b>.
            </div>

            {emailDetails ? (
              <div className={`rounded-2xl px-4 py-3 text-sm ${emailOk ? "bg-emerald-500/10 text-emerald-100" : "bg-amber-500/10 text-amber-100"}`}>
                {emailDetails}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 md:flex-row">
              <button
                onClick={checkEmailRouting}
                disabled={loading}
                className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-5 py-3 font-semibold text-violet-100 hover:bg-violet-500/15 disabled:opacity-60"
              >
                {loading ? "Verificando..." : "Verificar Email Routing"}
              </button>
              <button
                onClick={() => {
                  clearDraft();
                  setSavedDraft(null);
                  setDraftActive(false);
                  setStep(6);
                }}
                className="rounded-xl bg-emerald-600 px-5 py-3 font-bold hover:bg-emerald-500"
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
              <p className="mt-2 text-sm text-white/55">
                Seu site foi criado. O domínio e o email podem levar alguns minutos para propagar.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <a
                href={`https://${domain}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-emerald-100 hover:bg-emerald-500/15"
              >
                <div className="text-sm text-emerald-100/70">Site</div>
                <div className="mt-1 break-all font-bold">https://{domain}</div>
              </a>
              <Link
                href={`/emails/${encodeURIComponent(domain)}`}
                className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-5 text-violet-100 hover:bg-violet-500/15"
              >
                <div className="text-sm text-violet-100/70">Inbox</div>
                <div className="mt-1 break-all font-bold">{contactEmail}</div>
              </Link>
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <button
                onClick={() => router.push("/sites")}
                className="rounded-xl bg-violet-600 px-5 py-3 font-bold hover:bg-violet-500"
              >
                Ver meus sites
              </button>
              {siteId ? (
                <button
                  onClick={() => router.push(`/sites/${siteId}/edit`)}
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-semibold hover:bg-white/10"
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
