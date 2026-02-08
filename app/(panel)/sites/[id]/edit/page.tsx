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

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("sites")
        .select(
          "id, slug, company_name, cnpj, mission, phone, email, instagram, whatsapp, about, privacy, footer, is_public, meta_verify_name, meta_verify_content"
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
    }

    load();
  }, [id, router, supabase]);

  async function handleSave() {
    // valida meta tag
    const parsedMeta = parseMetaTag(metaTag);
    if (metaTag.trim().toLowerCase().includes("<meta") && (!parsedMeta.name || !parsedMeta.content)) {
      alert("Meta tag inválida. Cole a tag completa do Business Manager.");
      return;
    }

    setLoading(true);

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
      })
      .eq("id", id);

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-white">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Editar Site</h1>
        <Link href="/dashboard" className="text-sm text-white/70 hover:text-white">
          ← Voltar para o Dashboard
        </Link>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="mb-5 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-sm text-white/70">Slug</div>
          <div className="text-lg font-semibold">{slug}</div>
          <div className="mt-2 text-xs text-white/60">
            Público:{" "}
            <span className={isPublic ? "text-emerald-300" : "text-red-300"}>
              {isPublic ? "Sim" : "Não"}
            </span>
          </div>

          <label className="mt-3 inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            Deixar site público
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Nome da Empresa" required>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400/40"
            />
          </Field>

          <Field label="CNPJ" required>
            <input
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400/40"
            />
          </Field>

          <Field label="Telefone" required>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400/40"
            />
          </Field>

          <Field label="E-mail" required>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400/40"
            />
          </Field>

          <Field label="WhatsApp" required>
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400/40"
            />
          </Field>

          <Field label="Instagram" required={false} hint="Opcional">
            <input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400/40"
            />
          </Field>

          <Field
            label="Meta tag de verificação"
            required={false}
            hint='Cole a tag completa. Ex: <meta name="facebook-domain-verification" content="..." />'
          >
            <input
              value={metaTag}
              onChange={(e) => setMetaTag(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400/40"
              placeholder='<meta name="facebook-domain-verification" content="..." />'
            />
          </Field>
        </div>

        <div className="mt-6 grid gap-5">
          <Field label="Nossa missão" required>
            <textarea
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              className="min-h-[90px] w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400/40"
            />
          </Field>

          <Field label="Quem somos (About)" required>
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              className="min-h-[140px] w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400/40"
            />
          </Field>

          <Field label="Política de Privacidade" required>
            <textarea
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value)}
              className="min-h-[160px] w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400/40"
            />
          </Field>

          <Field label="Rodapé" required>
            <textarea
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              className="min-h-[90px] w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400/40"
            />
          </Field>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="mt-6 w-full rounded-2xl bg-violet-600 px-5 py-4 font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
        >
          {loading ? "Salvando..." : "Salvar alterações (não consome token)"}
        </button>
      </div>
    </div>
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
    <div className="space-y-2">
      <div className="text-sm font-medium text-white/85">
        {label} {required ? <span className="text-red-300">*</span> : null}
      </div>
      {children}
      {hint ? <div className="text-xs text-white/55">{hint}</div> : null}
    </div>
  );
}
