"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";

type SiteRow = {
  id: string;
  slug: string;
  status: "draft" | "active" | "inactive" | string;
};

type ContentRow = {
  site_id: string;
  legal_name: string | null;
  cnpj: string | null;
  mission: string | null;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  whatsapp: string | null;
  about: string | null;
  footer: string | null;
  meta_pixel: string | null;
  meta_domain_verification: string | null;
  meta_app_id: string | null;
  facebook_page_link: string | null;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export default function EditSitePage() {
  const supabase = supabaseBrowser();
  const params = useParams<{ id: string }>();
  const siteId = params.id;

  const baseDomain = useMemo(() => process.env.NEXT_PUBLIC_BASE_DOMAIN || "plpainel.com", []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [site, setSite] = useState<SiteRow | null>(null);

  // Form fields (conteúdo)
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState<SiteRow["status"]>("active");

  const [legalName, setLegalName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [mission, setMission] = useState("");

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const [about, setAbout] = useState("");
  const [footer, setFooter] = useState("");

  const [metaPixel, setMetaPixel] = useState("");
  const [metaDomainVerification, setMetaDomainVerification] = useState("");
  const [metaAppId, setMetaAppId] = useState("");
  const [facebookPageLink, setFacebookPageLink] = useState("");

  const siteUrl = slug ? `https://${slug}.${baseDomain}` : "";

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!session?.user) {
        window.location.href = "/login";
        return;
      }

      // 1) carrega site
      const { data: s, error: sErr } = await supabase
        .from("sites")
        .select("id,slug,status")
        .eq("id", siteId)
        .single();

      if (sErr) {
        alert("Erro ao carregar site: " + sErr.message);
        window.location.href = "/sites";
        return;
      }

      setSite(s as any);
      setSlug(s.slug);
      setStatus(s.status);

      // 2) carrega conteúdo
      const { data: c, error: cErr } = await supabase
        .from("site_content")
        .select(
          "site_id,legal_name,cnpj,mission,phone,email,instagram,whatsapp,about,footer,meta_pixel,meta_domain_verification,meta_app_id,facebook_page_link"
        )
        .eq("site_id", siteId)
        .single();

      if (cErr) {
        // Se não existir conteúdo por algum motivo, a gente não quebra.
        // (Mas normalmente sempre existe).
        console.log(cErr);
      }

      const content = (c as ContentRow) || null;

      setLegalName(content?.legal_name ?? "");
      setCnpj(content?.cnpj ?? "");
      setMission(content?.mission ?? "");

      setPhone(content?.phone ?? "");
      setEmail(content?.email ?? "");
      setInstagram(content?.instagram ?? "");
      setWhatsapp(content?.whatsapp ?? "");

      setAbout(content?.about ?? "");
      setFooter(content?.footer ?? "");

      setMetaPixel(content?.meta_pixel ?? "");
      setMetaDomainVerification(content?.meta_domain_verification ?? "");
      setMetaAppId(content?.meta_app_id ?? "");
      setFacebookPageLink(content?.facebook_page_link ?? "");

      setLoading(false);
    }

    load();
  }, [siteId]);

  function fillFooter() {
    const parts: string[] = [];
    if (legalName) parts.push(legalName);
    if (cnpj) parts.push(`CNPJ: ${cnpj}`);
    if (phone) parts.push(phone);
    if (email) parts.push(email);
    setFooter(parts.join(" • "));
  }

  async function onSave() {
    if (saving) return;

    const s = slugify(slug);
    if (!s) return alert("Slug inválido.");
    if (!legalName) return alert("Preencha a Razão Social.");
    if (!cnpj) return alert("Preencha o CNPJ.");
    if (!mission) return alert("Preencha a Missão.");
    if (!phone) return alert("Preencha o Telefone.");
    if (!email) return alert("Preencha o E-mail.");
    if (!whatsapp) return alert("Preencha o WhatsApp.");
    if (!about) return alert("Preencha o Sobre.");
    if (!footer) return alert("Preencha o Rodapé.");
    if (!facebookPageLink) return alert("Preencha o Link da Página (Facebook).");

    setSaving(true);

    // 1) atualiza site (slug/status)
    const { error: sErr } = await supabase
      .from("sites")
      .update({ slug: s, status })
      .eq("id", siteId);

    if (sErr) {
      setSaving(false);
      const msg = (sErr.message || "").toLowerCase();
      if (msg.includes("duplicate")) return alert("Esse slug já existe. Escolha outro.");
      return alert("Erro ao salvar site: " + sErr.message);
    }

    // 2) upsert do conteúdo
    const { error: cErr } = await supabase.from("site_content").upsert({
      site_id: siteId,
      legal_name: legalName,
      cnpj,
      mission,
      phone,
      email,
      instagram,
      whatsapp,
      about,
      footer,
      meta_pixel: metaPixel,
      meta_domain_verification: metaDomainVerification,
      meta_app_id: metaAppId,
      facebook_page_link: facebookPageLink,
    });

    setSaving(false);

    if (cErr) return alert("Erro ao salvar conteúdo: " + cErr.message);

    alert("Alterações salvas!");
    window.location.href = "/sites";
  }

  if (loading) return <div className="text-white/70">Carregando...</div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Editar Site</h1>
          <p className="text-white/60 text-sm mt-1">
            {siteUrl ? (
              <>
                URL:{" "}
                <a className="text-white underline" href={siteUrl} target="_blank">
                  {siteUrl}
                </a>
              </>
            ) : (
              "—"
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link className="rounded-xl bg-white/10 hover:bg-white/15 transition px-3 py-2 text-sm" href="/sites">
            Voltar
          </Link>
          <button
            disabled={saving}
            onClick={onSave}
            className="rounded-xl bg-violet-600 hover:bg-violet-500 transition px-4 py-2 font-semibold"
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-6">
        {/* Domínio */}
        <div className="text-violet-300 font-semibold mb-2">Domínio</div>
        <label className="text-white/70 text-sm">Slug (subdomínio)</label>
        <input
          className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 p-3"
          placeholder="ex: tk-marketing-digital"
          value={slug}
          onChange={(e) => setSlug(slugify(e.target.value))}
        />

        <div className="mt-4 grid grid-cols-1 gap-3">
          <label className="text-white/70 text-sm">Status</label>
          <select
            className="w-full rounded-xl bg-white/5 border border-white/10 p-3"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
            <option value="draft">Rascunho</option>
          </select>
          <div className="text-white/50 text-xs">
            * “Inativo” pode ser usado pra tirar do ar (na Fase 6 a gente respeita isso).
          </div>
        </div>

        {/* Info básicas */}
        <div className="mt-8 text-violet-300 font-semibold mb-2">Informações Básicas</div>
        <div className="grid grid-cols-1 gap-3">
          <input
            className="w-full rounded-xl bg-white/5 border border-white/10 p-3"
            placeholder="Razão Social"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
          />
          <input
            className="w-full rounded-xl bg-white/5 border border-white/10 p-3"
            placeholder="CNPJ"
            value={cnpj}
            onChange={(e) => setCnpj(e.target.value)}
          />
          <textarea
            className="w-full rounded-xl bg-white/5 border border-white/10 p-3 min-h-[110px]"
            placeholder="Missão"
            value={mission}
            onChange={(e) => setMission(e.target.value)}
          />
        </div>

        {/* Contatos */}
        <div className="mt-8 text-violet-300 font-semibold mb-2">Contatos</div>
        <div className="grid grid-cols-1 gap-3">
          <input
            className="w-full rounded-xl bg-white/5 border border-white/10 p-3"
            placeholder="Telefone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            className="w-full rounded-xl bg-white/5 border border-white/10 p-3"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full rounded-xl bg-white/5 border border-white/10 p-3"
            placeholder="Instagram (opcional)"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
          />
          <input
            className="w-full rounded-xl bg-white/5 border border-white/10 p-3"
            placeholder="WhatsApp"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
          />
        </div>

        {/* Conteúdo */}
        <div className="mt-8 text-violet-300 font-semibold mb-2">Conteúdo</div>
        <textarea
          className="w-full rounded-xl bg-white/5 border border-white/10 p-3 min-h-[140px]"
          placeholder="Sobre"
          value={about}
          onChange={(e) => setAbout(e.target.value)}
        />
        <div className="mt-3 flex items-center gap-3">
          <input
            className="flex-1 rounded-xl bg-white/5 border border-white/10 p-3"
            placeholder="Rodapé"
            value={footer}
            onChange={(e) => setFooter(e.target.value)}
          />
          <button
            className="rounded-xl bg-white/10 hover:bg-white/15 transition px-3 py-2 text-sm"
            type="button"
            onClick={fillFooter}
          >
            Auto
          </button>
        </div>

        {/* Integrações */}
        <div className="mt-8 text-violet-300 font-semibold mb-2">Integrações e Links</div>
        <div className="grid grid-cols-1 gap-3">
          <input
            className="w-full rounded-xl bg-white/5 border border-white/10 p-3"
            placeholder="Pixel Meta (opcional)"
            value={metaPixel}
            onChange={(e) => setMetaPixel(e.target.value)}
          />
          <input
            className="w-full rounded-xl bg-white/5 border border-white/10 p-3"
            placeholder="Meta Tag (verificação de domínio) (opcional)"
            value={metaDomainVerification}
            onChange={(e) => setMetaDomainVerification(e.target.value)}
          />
          <input
            className="w-full rounded-xl bg-white/5 border border-white/10 p-3"
            placeholder="App ID (opcional)"
            value={metaAppId}
            onChange={(e) => setMetaAppId(e.target.value)}
          />
          <input
            className="w-full rounded-xl bg-white/5 border border-white/10 p-3"
            placeholder="Link da Página (Facebook)"
            value={facebookPageLink}
            onChange={(e) => setFacebookPageLink(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
