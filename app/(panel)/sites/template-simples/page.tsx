"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { useRouter } from "next/navigation";

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
    const marca = String(simpleName || "").trim();
    const empresaMae = String(companyName || "").trim();

    if (!marca) return "";

    if (!empresaMae) {
      return `A ${marca} é uma marca criada para representar nossa atuação com qualidade, profissionalismo e compromisso com cada cliente.`;
    }

    return `A ${marca} é uma marca pertencente à ${empresaMae}. Criada dentro da empresa, ela faz parte do nosso ecossistema de soluções criativas, mantendo os mesmos valores de qualidade, profissionalismo e compromisso com cada cliente.`;
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
      setAboutSimple(
        first.about_simple || buildAutoAbout(initialTitle, first.company_name || "")
      );
      setLogoUrl(first.logo_url || null);
      setUploadName("");
      setAboutTouched(false);
    }

    setLoading(false);
  }

  function handleSelectSite(nextId: string) {
    setSiteId(nextId);

    const selected = sites.find((s) => s.id === nextId) || null;
    const nextTitle = selected?.simple_title || selected?.company_name || "";

    setCurrentSite(selected);
    setSimpleTitle(nextTitle);
    setAboutSimple(
      selected?.about_simple || buildAutoAbout(nextTitle, selected?.company_name || "")
    );
    setLogoUrl(selected?.logo_url || null);
    setLogoFile(null);
    setUploadName("");
    setAboutTouched(false);
  }

  async function handleApply() {
    setMsg(null);

    if (!siteId) {
      setMsg("Selecione um site.");
      return;
    }

    if (!simpleTitle.trim()) {
      setMsg("Preencha o nome da empresa no template.");
      return;
    }

    if (!aboutSimple.trim()) {
      setMsg("Preencha o Sobre nós.");
      return;
    }

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
          .upload(filePath, logoFile, {
            upsert: true,
          });

        if (uploadError) {
          setMsg(uploadError.message || "Erro ao enviar imagem.");
          setSaving(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from("site-assets")
          .getPublicUrl(uploadData.path);

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
    } catch (e: any) {
      setMsg(e?.message || "Erro ao aplicar template.");
    } finally {
      setSaving(false);
    }
  }

  const msgIsSuccess = msg?.toLowerCase().includes("sucesso");

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 text-white">
      <h1 className="text-2xl font-bold">Template Simples</h1>
      <p className="mt-1 text-sm text-white/60">
        Atualize um site já criado usando o mesmo domínio, com logo, nome personalizado, sobre nós e rodapé.
      </p>

      {msg && (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            msgIsSuccess
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/20 bg-red-500/10 text-red-200"
          }`}
        >
          {msg}
        </div>
      )}

      {loading ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
          Carregando sites...
        </div>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4 text-sm text-white/60">
              Atualize um site já criado usando o mesmo domínio.
            </div>

            <label className="text-sm font-semibold">Escolha o site</label>
            <div className="mt-2">
              <select
                value={siteId}
                onChange={(e) => handleSelectSite(e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition hover:border-violet-400/60 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30"
              >
                <option className="bg-slate-900 text-white" value="">
                  Selecione
                </option>
                {sites.map((s) => (
                  <option
                    key={s.id}
                    value={s.id}
                    className="bg-slate-900 text-white"
                  >
                    {s.slug}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5">
              <label className="text-sm font-semibold">Upload da logo</label>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500">
                  Escolher arquivo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      setLogoFile(file);
                      setUploadName(file.name);
                      setLogoUrl(URL.createObjectURL(file));
                    }}
                  />
                </label>

                <span className="max-w-[260px] truncate text-sm text-white/70">
                  {uploadName || "Nenhum arquivo escolhido"}
                </span>
              </div>
            </div>

            <div className="mt-5">
              <label className="text-sm font-semibold">Nome da empresa no template</label>
              <input
                value={simpleTitle}
                onChange={(e) => {
                  const value = e.target.value;
                  setSimpleTitle(value);

                  if (!aboutTouched) {
                    setAboutSimple(
                      buildAutoAbout(value, currentSite?.company_name || "")
                    );
                  }
                }}
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition hover:border-violet-400/60 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30"
                placeholder="Ex: MT Cap"
              />
            </div>

            <div className="mt-5">
              <label className="text-sm font-semibold">Sobre nós</label>
              <textarea
                value={aboutSimple}
                onChange={(e) => {
                  setAboutTouched(true);
                  setAboutSimple(e.target.value);
                }}
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 p-4 text-white outline-none transition hover:border-violet-400/60 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30"
                rows={8}
                placeholder="Digite o novo texto do sobre nós"
              />
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={handleApply}
                disabled={saving}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
              >
                {saving ? "Aplicando..." : "Aplicar template"}
              </button>

              <button
                onClick={() => router.push("/sites")}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 font-semibold text-white/80 transition hover:bg-white/10"
              >
                Voltar
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4 text-sm font-semibold">Prévia</div>

            <div className="min-h-[560px] rounded-2xl bg-black p-8 text-white">
              <div className="flex justify-center">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="max-h-36 max-w-full object-contain"
                  />
                ) : (
                  <div className="text-lg font-semibold text-white/40">
                    Nenhuma logo enviada
                  </div>
                )}
              </div>

              <div className="mt-10 text-center">
                <h2 className="text-2xl font-bold">
                  Quem é {simpleTitle || currentSite?.company_name || "Empresa"}?
                </h2>
              </div>

              <div className="mt-6 text-center">
                <div className="whitespace-pre-line text-sm leading-7 text-gray-300">
                  {aboutSimple || "Seu texto sobre nós aparecerá aqui."}
                </div>
              </div>

              <div className="mt-16 bg-blue-700 px-6 py-6 text-center">
                <div className="whitespace-pre-line text-sm leading-7 text-white">
                  {currentSite?.footer || "Rodapé do site"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
