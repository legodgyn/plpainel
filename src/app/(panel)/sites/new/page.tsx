"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

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

export default function NewSitePage() {
  const supabase = supabaseBrowser();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [balance, setBalance] = useState<number>(0);

  // Form fields
  const [slug, setSlug] = useState("");
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

  const baseDomain = useMemo(() => {
    return process.env.NEXT_PUBLIC_BASE_DOMAIN || "plpainel.com";
  }, []);

  const siteUrlPreview = slug ? `https://${slug}.${baseDomain}` : "";

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!session?.user) {
        window.location.href = "/login";
        return;
      }

      const { data: wallet, error } = await supabase
        .from("token_wallets")
        .select("balance")
        .eq("user_id", session.user.id)
        .single();

      if (error) console.log(error);

      setBalance(wallet?.balance ?? 0);
      setLoading(false);
    }

    load();
  }, []);

  function fillFooter() {
    const parts: string[] = [];
    if (legalName) parts.push(legalName);
    if (cnpj) parts.push(`CNPJ: ${cnpj}`);
    if (phone) parts.push(phone);
    if (email) parts.push(email);
    setFooter(parts.join(" • "));
  }

  async function onCreateSite() {
    if (saving) return;

    // validações mínimas
    const s = slugify(slug);
    if (!s) return alert("Preencha um domínio (slug). Ex: minha-empresa");
    if (!legalName) return alert("Preencha a Razão Social.");
    if (!cnpj) return alert("Preencha o CNPJ.");
    if (!mission) return alert("Preencha a Missão.");
    if (!phone) return alert("Preencha o Telefone.");
    if (!email) return alert("Preencha o E-mail.");
    if (!whatsapp) return alert("Preencha o WhatsApp.");
    if (!about) return alert("Preencha o Sobre.");
    if (!footer) return alert("Preencha o Rodapé.");
    if (!facebookPageLink) return alert("Preencha o Link da Página (Facebook).");

    if (balance < 1) {
      return alert("Você não tem tokens suficientes. Compre tokens para criar um site.");
    }

    setSaving(true);

    const { data, error } = await supabase.rpc("create_site_with_token", {
      p_slug: s,
      p_legal_name: legalName,
      p_cnpj: cnpj,
      p_mission: mission,
      p_phone: phone,
      p_email: email,
      p_instagram: instagram || "",
      p_whatsapp: whatsapp,
      p_about: about,
      p_footer: footer,
      p_meta_pixel: metaPixel || "",
      p_meta_domain_verification: metaDomainVerification || "",
      p_meta_app_id: metaAppId || "",
      p_facebook_page_link: facebookPageLink,
    });

    setSaving(false);

    if (error) {
      // mensagens mais amigáveis
      const msg = (error.message || "").toLowerCase();

      if (msg.includes("insufficient")) {
        alert("Sem tokens suficientes.");
        return;
      }
      if (msg.includes("duplicate") || msg.includes("already exists")) {
        alert("Esse domínio já existe. Escolha outro slug.");
        return;
      }

      alert("Erro ao criar site: " + error.message);
      return;
    }

    const res = data as any;
    if (typeof res?.new_balance === "number") {
      setBalance(res.new_balance);
    } else {
      setBalance((b) => Math.max(0, b - 1));
    }

    alert("Site criado com sucesso!");
    window.location.href = "/sites";
  }

  if (loading) {
    return <div className="text-white/70">Carregando...</div>;
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Criar Novo Site</h1>
        <div className="text-white/70 text-sm">
          Tokens: <span className="text-white">{balance}</span>
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
        {siteUrlPreview && (
          <div className="text-white/60 text-sm mt-2">
            Prévia: <span className="text-white">{siteUrlPreview}</span>
          </div>
        )}

        {/* Informações Básicas */}
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

        <div className="mt-8">
          <button
            disabled={saving}
            onClick={onCreateSite}
            className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 transition p-3 font-semibold"
          >
            {saving ? "Gerando..." : "Gerar Site"}
          </button>
          <div className="text-white/60 text-xs mt-2">
            1 token = 1 site. Ao gerar, será debitado 1 token.
          </div>
        </div>
      </div>
    </div>
  );
}
