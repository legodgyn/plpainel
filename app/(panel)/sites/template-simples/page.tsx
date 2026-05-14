"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

type SiteRow = {
  id: string;
  user_id: string;
  slug: string;
  company_name: string | null;
  footer: string | null;
  about: string | null;
  about_simple: string | null;
  logo_url: string | null;
  template_type: string | null;
  simple_title: string | null;
};

export default function TemplateSimplePage() {
  const router = useRouter();

  const [sites, setSites] = useState<SiteRow[]>([]);
  const [siteId, setSiteId] = useState("");
  const [aboutSimple, setAboutSimple] = useState("");
  const [simpleTitle, setSimpleTitle] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [currentSite, setCurrentSite] = useState<SiteRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [aboutTouched, setAboutTouched] = useState(false);

  useEffect(() => {
    loadSites();
  }, []);

  function buildAutoAbout(simpleName: string, companyName: string) {
    const brand = String(simpleName || "").trim();
    const company = String(companyName || "").trim();

    if (!brand) return "";
    if (!company) {
      return `A ${brand} e uma marca criada para representar nossa atuacao com qualidade, profissionalismo e compromisso com cada cliente.`;
    }

    return `A ${brand} e uma marca pertencente a ${company}. Criada dentro da empresa, ela faz parte do nosso ecossistema de solucoes criativas, mantendo os mesmos valores de qualidade, profissionalismo e compromisso com cada cliente.`;
  }

  async function loadSites() {
    setLoading(true);
    setMsg(null);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;

    if (!user) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("sites")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setMsg(error.message || "Erro ao carregar sites.");
      setSites([]);
      setLoading(false);
      return;
    }

    const rows = (data as SiteRow[]) || [];
    setSites(rows);

    if (rows.length > 0) {
      const first = rows[0];
      const initialTitle = first.simple_title || first.company_name || "";

      setSiteId(first.id);
      setCurrentSite(first);
      setSimpleTitle(initialTitle);
      setAboutSimple(first.about_simple || buildAutoAbout(initialTitle, first.company_name || ""));
      setLogoUrl(first.logo_url || null);
      setUploadName("");
      setAboutTouched(false);
    }

    setLoading(false);
  }

  function handleSelectSite(nextId: string) {
    setSiteId(nextId);

    const selected = sites.find((site) => site.id === nextId) || null;
    const nextTitle = selected?.simple_title || selected?.company_name || "";

    setCurrentSite(selected);
    setSimpleTitle(nextTitle);
    setAboutSimple(selected?.about_simple || buildAutoAbout(nextTitle, selected?.company_name || ""));
    setLogoUrl(selected?.logo_url || null);
    setLogoFile(null);
    setUploadName("");
    setAboutTouched(false);
  }

  async function handleApply() {
    setMsg(null);

    if (!siteId) return setMsg("Selecione um site.");
    if (!simpleTitle.trim()) return setMsg("Preencha o nome da empresa no template.");
    if (!aboutSimple.trim()) return setMsg("Preencha o Sobre nos.");

    setSaving(true);
    try {
      let uploadedLogo = logoUrl;

      if (logoFile) {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;

        if (!user) {
          router.push("/login");
          return;
        }

        const ext = logoFile.name.split(".").pop() || "png";
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const filePath = `${user.id}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("site-assets")
          .upload(filePath, logoFile, { upsert: true });

        if (uploadError) {
          setMsg(uploadError.message || "Erro ao enviar imagem.");
          setSaving(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage.from("site-assets").getPublicUrl(uploadData.path);
        uploadedLogo = publicUrlData.publicUrl;
      }

      const { error } = await supabase
        .from("sites")
        .update({
          template_type: "simple",
          logo_url: uploadedLogo,
          about_simple: aboutSimple.trim(),
          simple_title: simpleTitle.trim() || null,
        })
        .eq("id", siteId);

      if (error) {
        setMsg(error.message || "Erro ao aplicar template.");
        setSaving(false);
        return;
      }

      setMsg("Template aplicado com sucesso!");
      await loadSites();
    } catch (error: any) {
      setMsg(error?.message || "Erro ao aplicar template.");
    } finally {
      setSaving(false);
    }
  }

  const msgIsSuccess = msg?.toLowerCase().includes("sucesso");

  return (
    <main className="pl-page max-w-7xl space-y-6">
      <div className="pl-page-title">
        <div>
          <span className="pl-badge">Visual do site</span>
          <h1>Alterar Layout</h1>
          <p>Atualize um site ja criado mantendo dominio, dados e conteudo principal.</p>
        </div>
        <button type="button" onClick={() => router.push("/sites")} className="pl-btn">
          Meus sites
        </button>
      </div>

      {msg ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
            msgIsSuccess
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {msg}
        </div>
      ) : null}

      {loading ? (
        <div className="pl-card-soft text-sm font-semibold text-slate-500">Carregando sites...</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
          <section className="pl-card">
            <div className="pl-card-head">
              <div>
                <h2>Configuracao</h2>
                <p>Escolha o site, envie uma logo opcional e ajuste o texto de apresentacao.</p>
              </div>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <label className="pl-label">Escolha o site</label>
                <select value={siteId} onChange={(event) => handleSelectSite(event.target.value)} className="pl-select mt-2">
                  <option value="">Selecione</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.slug}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="pl-label">Logo opcional</label>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <label className="pl-btn cursor-pointer">
                    Escolher arquivo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        setLogoFile(file);
                        setUploadName(file.name);
                        setLogoUrl(URL.createObjectURL(file));
                      }}
                    />
                  </label>
                  <span className="max-w-[260px] truncate text-sm font-semibold text-slate-500">
                    {uploadName || "Nenhum arquivo escolhido"}
                  </span>
                </div>
              </div>

              <div>
                <label className="pl-label">Nome da empresa no template</label>
                <input
                  value={simpleTitle}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSimpleTitle(value);
                    if (!aboutTouched) {
                      setAboutSimple(buildAutoAbout(value, currentSite?.company_name || ""));
                    }
                  }}
                  className="pl-input mt-2"
                  placeholder="Ex: MT Cap"
                />
              </div>

              <div>
                <label className="pl-label">Sobre nos</label>
                <textarea
                  value={aboutSimple}
                  onChange={(event) => {
                    setAboutTouched(true);
                    setAboutSimple(event.target.value);
                  }}
                  className="pl-textarea mt-2"
                  rows={8}
                  placeholder="Digite o novo texto do sobre nos"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={handleApply} disabled={saving} className="pl-btn pl-btn-primary">
                  {saving ? "Aplicando..." : "Aplicar layout"}
                </button>
                <button type="button" onClick={() => router.push("/sites")} className="pl-btn">
                  Voltar
                </button>
              </div>
            </div>
          </section>

          <section className="pl-card">
            <div className="pl-card-head">
              <div>
                <h2>Previa</h2>
                <p>Simulacao rapida do bloco principal publicado.</p>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-[30px] border border-slate-200 bg-slate-950 text-white shadow-sm">
              <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-slate-950 p-8">
                <div className="flex justify-center">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="max-h-28 max-w-full object-contain drop-shadow" />
                  ) : (
                    <div className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white/70">
                      Logo opcional
                    </div>
                  )}
                </div>

                <div className="mx-auto mt-10 max-w-2xl text-center">
                  <div className="text-sm font-black uppercase tracking-[0.18em] text-emerald-100">Quem somos</div>
                  <h2 className="mt-3 text-3xl font-black">
                    {simpleTitle || currentSite?.company_name || "Empresa"}
                  </h2>
                  <p className="mt-5 whitespace-pre-line text-sm font-semibold leading-7 text-white/85">
                    {aboutSimple || "Seu texto sobre nos aparecera aqui."}
                  </p>
                </div>
              </div>

              <div className="bg-slate-950 p-6 text-center text-sm font-semibold leading-7 text-white/70">
                {currentSite?.footer || "Rodape do site"}
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
