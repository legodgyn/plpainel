"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { useRouter } from "next/navigation";

type DomainRow = {
  id: string;
  domain: string;
};

export default function CreateSiteWithDomainPage() {
  const router = useRouter();

  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [domainId, setDomainId] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [mission, setMission] = useState("");
  const [about, setAbout] = useState("");
  const [privacy, setPrivacy] = useState("");
  const [footer, setFooter] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function loadDomains() {
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;

    if (!user) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
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
      setDomains(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadDomains();
  }, []);

  async function handleCreate() {
    setMsg(null);

    if (!domainId) return setMsg("Selecione um domínio.");
    if (!companyName.trim()) return setMsg("Preencha o nome da empresa.");
    if (!cnpj.trim()) return setMsg("Preencha o CNPJ.");
    if (!email.trim()) return setMsg("Preencha o e-mail.");

    setSaving(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/sites/create-with-domain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          domainId,
          companyName: companyName.trim(),
          cnpj: cnpj.trim(),
          phone: phone.trim(),
          email: email.trim(),
          whatsapp: whatsapp.trim(),
          instagram: instagram.trim() || null,
          mission: mission.trim(),
          about: about.trim(),
          privacy: privacy.trim(),
          footer: footer.trim(),
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        setMsg(json.error || "Erro ao criar site.");
        setSaving(false);
        return;
      }

      router.push("/sites");
    } catch (err: any) {
      setMsg(err?.message || "Erro ao criar site.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 text-white">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-bold">Criar Site com Domínio</h1>
        <p className="mt-1 text-sm text-white/60">
          Escolha um domínio comprado e crie seu site sem subdomínio.
        </p>
      </div>

      {msg && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {msg}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
        {loading ? (
          <div className="text-white/60">Carregando domínios...</div>
        ) : domains.length === 0 ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-200">
            Você ainda não tem domínio disponível. Compre um domínio primeiro.
          </div>
        ) : (
          <>
            <Field label="Domínio comprado">
              <select
                value={domainId}
                onChange={(e) => setDomainId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-400"
              >
                <option value="">Selecione</option>
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.domain}
                  </option>
                ))}
              </select>
            </Field>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field label="Nome da Empresa">
                <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="input" />
              </Field>

              <Field label="CNPJ">
                <input value={cnpj} onChange={(e) => setCnpj(e.target.value)} className="input" />
              </Field>

              <Field label="Telefone">
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
              </Field>

              <Field label="E-mail">
                <input value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
              </Field>

              <Field label="WhatsApp">
                <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="input" />
              </Field>

              <Field label="Instagram">
                <input value={instagram} onChange={(e) => setInstagram(e.target.value)} className="input" />
              </Field>
            </div>

            <div className="mt-6 grid gap-5">
              <Field label="Nossa missão">
                <textarea value={mission} onChange={(e) => setMission(e.target.value)} className="textarea" />
              </Field>

              <Field label="Quem somos">
                <textarea value={about} onChange={(e) => setAbout(e.target.value)} className="textarea" />
              </Field>

              <Field label="Política de Privacidade">
                <textarea value={privacy} onChange={(e) => setPrivacy(e.target.value)} className="textarea" />
              </Field>

              <Field label="Rodapé">
                <textarea value={footer} onChange={(e) => setFooter(e.target.value)} className="textarea" />
              </Field>
            </div>

            <button
              onClick={handleCreate}
              disabled={saving}
              className="mt-6 w-full rounded-2xl bg-emerald-600 px-5 py-4 font-bold text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              {saving ? "Criando site..." : "Criar site com domínio"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-white/85">{label}</div>
      {children}
    </div>
  );
}