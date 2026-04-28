"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

// =====================
// Helpers (mantive tudo seu)
// =====================
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
    const p1 = rest.slice(0, 4);
    const p2 = rest.slice(4, 8);
    return `(${ddd}) ${p1}-${p2}`;
  }

  const r = digits.slice(2, 11);
  const p1 = r.slice(0, 5);
  const p2 = r.slice(5, 9);
  return `(${ddd}) ${p1}-${p2}`;
}

function parseMetaTag(input: string) {
  const raw = String(input || "").trim();
  if (!raw) return { name: null, content: null };

  if (!raw.toLowerCase().includes("<meta")) {
    return { name: "facebook-domain-verification", content: raw };
  }

  const nameMatch = raw.match(/name\s*=\s*["']([^"']+)["']/i);
  const contentMatch = raw.match(/content\s*=\s*["']([^"']+)["']/i);

  return {
    name: nameMatch?.[1] ?? null,
    content: contentMatch?.[1] ?? null,
  };
}

// =====================
// PAGE
// =====================

export default function NewSitePage() {
  const router = useRouter();

  const [form, setForm] = useState<any>({
    cnpj: "",
    company_name: "",
    phone: "",
    whatsapp: "",
    email: "",
    instagram: "",
    facebook: "",
    mission: "",
    about: "",
    privacy: "",
    footer: "",
    meta_tag: "",
  });

  const [domains, setDomains] = useState<any[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");

  const [loading, setLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [balance, setBalance] = useState<number>(0);

  // =====================
  // LOAD USER + DOMAINS
  // =====================
  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;

      if (!user) return;

      // coins
      const { data: bal } = await supabase
        .from("user_coin_balances")
        .select("balance")
        .eq("user_id", user.id)
        .single();

      setBalance(bal?.balance || 0);

      // domains
      const { data } = await supabase
        .from("available_domains")
        .select("id, domain")
        .eq("assigned_user_id", user.id)
        .eq("status", "sold")
        .is("assigned_site_id", null);

      setDomains(data || []);
    }

    load();
  }, []);

  // =====================
  // GERAR CNPJ
  // =====================
  async function generateFromCnpj() {
    setMsg(null);

    const cnpj = onlyDigits(form.cnpj);
    if (cnpj.length < 14) {
      setMsg("CNPJ inválido");
      return;
    }

    setGenLoading(true);

    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      const data = await res.json();

      const phone = formatBRPhone(data.ddd_telefone_1 || "");

      setForm((p: any) => ({
        ...p,
        company_name: data.razao_social,
        phone,
        whatsapp: phone,
        email: `contato@${data.razao_social.replace(/\s+/g, "").toLowerCase()}.com`,
      }));
    } catch {
      setMsg("Erro ao buscar CNPJ");
    } finally {
      setGenLoading(false);
    }
  }

  // =====================
  // CRIAR SITE
  // =====================
  async function handleCreate() {
    setMsg(null);

    if (!selectedDomainId) {
      setMsg("Selecione um domínio");
      return;
    }

    setLoading(true);

    try {
      const { name, content } = parseMetaTag(form.meta_tag);

      const { error } = await supabase.rpc("create_site_with_domain", {
        p_domain_id: selectedDomainId,
        p_custom_domain: selectedDomain,
        p_company_name: form.company_name,
        p_cnpj: onlyDigits(form.cnpj),
        p_phone: form.phone,
        p_email: form.email,
        p_instagram: form.instagram,
        p_whatsapp: form.whatsapp,
        p_mission: form.mission,
        p_about: form.about,
        p_privacy: form.privacy,
        p_footer: form.footer,
        p_meta_verify_name: name,
        p_meta_verify_content: content,
      });

      if (error) throw error;

      router.push("/sites");
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  }

  // =====================
  // UI
  // =====================

  return (
    <div className="max-w-5xl text-white">
      <h1 className="text-2xl font-bold">Criar Site com Domínio</h1>

      {/* DOMÍNIO */}
      <div className="mt-4">
        <label>Domínio *</label>
        <select
          value={selectedDomainId}
          onChange={(e) => {
            const id = e.target.value;
            setSelectedDomainId(id);
            const d = domains.find((x) => x.id === id);
            setSelectedDomain(d?.domain || "");
          }}
          className="w-full mt-1 p-2 bg-black border"
        >
          <option value="">Selecione</option>
          {domains.map((d) => (
            <option key={d.id} value={d.id}>
              {d.domain}
            </option>
          ))}
        </select>
      </div>

      {/* CNPJ */}
      <div className="mt-4">
        <input
          value={form.cnpj}
          onChange={(e) =>
            setForm((p: any) => ({ ...p, cnpj: formatCNPJ(e.target.value) }))
          }
          placeholder="CNPJ"
          className="w-full p-2 bg-black border"
        />

        <button onClick={generateFromCnpj}>
          {genLoading ? "..." : "Gerar dados"}
        </button>
      </div>

      {/* EMPRESA */}
      <input
        value={form.company_name}
        onChange={(e) =>
          setForm((p: any) => ({ ...p, company_name: e.target.value }))
        }
        placeholder="Empresa"
        className="w-full mt-3 p-2 bg-black border"
      />

      {/* META */}
      <textarea
        value={form.meta_tag}
        onChange={(e) =>
          setForm((p: any) => ({ ...p, meta_tag: e.target.value }))
        }
        placeholder="Meta tag facebook"
        className="w-full mt-3 p-2 bg-black border"
      />

      {/* BOTÃO */}
      <button
        onClick={handleCreate}
        className="mt-6 bg-green-600 px-4 py-2"
      >
        {loading ? "Criando..." : "Criar site"}
      </button>

      {msg && <div className="mt-3 text-red-400">{msg}</div>}
    </div>
  );
}
