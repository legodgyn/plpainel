"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

function parseMetaTag(input: string) {
  const raw = String(input || "").trim();
  if (!raw) return { name: null as string | null, content: null as string | null };

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

function normalizeTxt(input: string) {
  let raw = String(input || "").trim();
  if (!raw) return "";

  if (raw.toLowerCase().includes("<meta")) {
    const contentMatch = raw.match(/content\s*=\s*["']([^"']+)["']/i);
    raw = String(contentMatch?.[1] || "").trim();
  }

  raw = raw.replace(/^"+|"+$/g, "");
  raw = raw.replace(
    /^facebook-domain-verification=facebook-domain-verification=/i,
    "facebook-domain-verification="
  );

  if (!/^facebook-domain-verification=/i.test(raw)) {
    raw = `facebook-domain-verification=${raw}`;
  }

  return raw;
}

export default function EditSitePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [loading, setLoading] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [slug, setSlug] = useState("");
  const [baseDomain, setBaseDomain] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [mission, setMission] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [about, setAbout] = useState("");
  const [privacy, setPrivacy] = useState("");
  const [footer, setFooter] = useState("");
  const [metaTag, setMetaTag] = useState("");
  const [metaTxt, setMetaTxt] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("sites")
        .select(
          "id, slug, base_domain, company_name, cnpj, mission, phone, email, instagram, whatsapp, about, privacy, footer, is_public, meta_verify_name, meta_verify_content, meta_txt"
        )
        .eq("id", id)
        .single();

      setLoading(false);

      if (error || !data) {
        alert(error?.message || "Erro ao carregar site");
        router.push("/dashboard");
        return;
      }

      setSlug(data.slug || "");
      setBaseDomain(data.base_domain || "");
      setCompanyName(data.company_name || "");
      setCnpj(data.cnpj || "");
      setMission(data.mission || "");
      setPhone(data.phone || "");
      setEmail(data.email || "");
      setInstagram(data.instagram || "");
      setWhatsapp(data.whatsapp || "");
      setAbout(data.about || "");
      setPrivacy(data.privacy || "");
      setFooter(data.footer || "");
      setIsPublic(data.is_public ?? true);

      if (data.meta_verify_name && data.meta_verify_content) {
        setMetaTag(`<meta name="${data.meta_verify_name}" content="${data.meta_verify_content}" />`);
      } else {
        setMetaTag("");
      }

      setMetaTxt(data.meta_txt || "");
    }

    load();
  }, [id, router, supabase]);

  async function handleSave() {
    const parsedMeta = parseMetaTag(metaTag);
    const cleanTxt = normalizeTxt(metaTxt);

    if (
      metaTag.trim().toLowerCase().includes("<meta") &&
      (!parsedMeta.name || !parsedMeta.content)
    ) {
      alert("Meta tag invalida. Cole a tag completa do Business Manager.");
      return;
    }

    if (metaTxt.trim() && !cleanTxt.includes("facebook-domain-verification=")) {
      alert("TXT invalido.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("sites")
        .update({
          company_name: companyName.trim(),
          cnpj: cnpj.trim(),
          mission: mission.trim(),
          phone: phone.trim(),
          email: email.trim(),
          instagram: instagram.trim() || null,
          whatsapp: whatsapp.trim(),
          about: about.trim(),
          privacy: privacy.trim(),
          footer: footer.trim(),
          is_public: isPublic,
          meta_verify_name: parsedMeta.name,
          meta_verify_content: parsedMeta.content,
          meta_txt: cleanTxt || null,
        })
        .eq("id", id);

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      if (cleanTxt && slug && baseDomain) {
        const domain = `${slug}.${baseDomain}`;

        const cfRes = await fetch("/api/cloudflare/txt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain, txt: cleanTxt }),
        });

        const cfJson = await cfRes.json().catch(() => ({}));
        if (!cfRes.ok) {
          alert(cfJson?.error || "Site salvo, mas nao foi possivel criar o TXT no Cloudflare.");
          setLoading(false);
          return;
        }
      }

      router.push("/dashboard");
    } catch (err: any) {
      alert(err?.message || "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="pl-page max-w-5xl space-y-6">
      <div className="pl-page-title">
        <div>
          <span className="pl-badge">Edicao</span>
          <h1>Editar Site</h1>
          <p>Atualize dados, Meta Tag, textos institucionais e status publico do site.</p>
        </div>
        <Link href="/dashboard" className="pl-btn">
          Voltar para o Dashboard
        </Link>
      </div>

      <section className="pl-card">
        <div className="mb-5 rounded-[24px] border border-emerald-100 bg-emerald-50 p-4">
          <div className="text-sm font-bold text-emerald-700">Slug</div>
          <div className="text-lg font-black text-slate-950">{slug}</div>
          <div className="mt-2 text-sm font-bold text-emerald-700">Dominio base</div>
          <div className="text-lg font-black text-slate-950">{baseDomain || "-"}</div>

          <div className="mt-2 text-xs font-semibold text-slate-500">
            Publico:{" "}
            <span className={isPublic ? "text-emerald-700" : "text-red-600"}>
              {isPublic ? "Sim" : "Nao"}
            </span>
          </div>

          <label className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            Deixar site publico
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Nome da Empresa" required>
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="pl-input" />
          </Field>

          <Field label="CNPJ" required>
            <input value={cnpj} onChange={(e) => setCnpj(e.target.value)} className="pl-input" />
          </Field>

          <Field label="Telefone" required>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-input" />
          </Field>

          <Field label="E-mail" required>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="pl-input" />
          </Field>

          <Field label="WhatsApp" required>
            <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="pl-input" />
          </Field>

          <Field label="Instagram" required={false} hint="Opcional">
            <input value={instagram} onChange={(e) => setInstagram(e.target.value)} className="pl-input" />
          </Field>

          <Field
            label="Meta tag de verificacao"
            required={false}
            hint='Cole a tag completa. Ex: <meta name="facebook-domain-verification" content="..." />'
          >
            <input
              value={metaTag}
              onChange={(e) => setMetaTag(e.target.value)}
              className="pl-input"
              placeholder='<meta name="facebook-domain-verification" content="..." />'
            />
          </Field>

          <Field
            label="TXT de verificacao"
            required={false}
            hint="Cole o TXT completo ou so o token. Ex: facebook-domain-verification=..."
          >
            <input
              value={metaTxt}
              onChange={(e) => setMetaTxt(e.target.value)}
              className="pl-input"
              placeholder="facebook-domain-verification=..."
            />
          </Field>
        </div>

        <div className="mt-6 grid gap-5">
          <Field label="Nossa missao" required>
            <textarea value={mission} onChange={(e) => setMission(e.target.value)} className="pl-textarea min-h-[90px]" />
          </Field>

          <Field label="Quem somos (About)" required>
            <textarea value={about} onChange={(e) => setAbout(e.target.value)} className="pl-textarea min-h-[140px]" />
          </Field>

          <Field label="Politica de Privacidade" required>
            <textarea value={privacy} onChange={(e) => setPrivacy(e.target.value)} className="pl-textarea min-h-[160px]" />
          </Field>

          <Field label="Rodape" required>
            <textarea value={footer} onChange={(e) => setFooter(e.target.value)} className="pl-textarea min-h-[90px]" />
          </Field>
        </div>

        <button onClick={handleSave} disabled={loading} className="pl-btn pl-btn-primary mt-6 w-full">
          {loading ? "Salvando..." : "Salvar alteracoes (nao consome token)"}
        </button>
      </section>
    </main>
  );
}

function Field({
  label,
  hint,
  required = true,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="pl-label">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </div>
      {children}
      {hint ? <div className="mt-2 text-xs font-semibold text-slate-500">{hint}</div> : null}
    </div>
  );
}
