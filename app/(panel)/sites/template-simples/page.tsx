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
};

export default function TemplateSimplePage() {
  const router = useRouter();

  const [sites, setSites] = useState<SiteRow[]>([]);
  const [siteId, setSiteId] = useState("");
  const [aboutSimple, setAboutSimple] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [currentSite, setCurrentSite] = useState<SiteRow | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState("");

  useEffect(() => {
    loadSites();
  }, []);

  async function loadSites() {
    setLoading(true);
    setMsg(null);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;

    if (!user) {
      router.push("/login");
      return;
    }

    // ✅ AGORA FILTRA SÓ OS SITES DO USUÁRIO LOGADO
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
      setSiteId(first.id);
      setCurrentSite(first);
      setAboutSimple(first.about_simple || first.about || "");
      setLogoUrl(first.logo_url || null);
      setUploadName("");
    }

    setLoading(false);
  }

  function handleSelectSite(nextId: string) {
    setSiteId(nextId);

    const selected = sites.find((s) => s.id === nextId) || null;
    setCurrentSite(selected);
    setAboutSimple(selected?.about_simple || selected?.about || "");
    setLogoUrl(selected?.logo_url || null);
    setLogoFile(null);
    setUploadName("");
  }

  async function handleApply() {
    setMsg(null);

    if (!siteId) {
      setMsg("Selecione um site.");
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
        Atualize um site já criado usando o mesmo domínio, com logo, sobre nós e rodapé.
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
          {/* FORM */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-sm text-white/60 mb-4">
              Atualize um site já criado usando o mesmo domínio.
            </div>

            <label className="text-sm font-semibold">Escolha o site</label>
            <select
              value={siteId}
              onChange={(e) => handleSelectSite(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-violet-400"
            >
              <option value="">Selecione</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.slug}
                </option>
              ))}
            </select>

            <div className="mt-5">
              <label className="text-sm font-semibold">Upload da logo</label>

              {/* ✅ BOTÃO BONITO DE UPLOAD */}
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500">
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
              <label className="text-sm font-semibold">Sobre nós</label>
              <textarea
                value={aboutSimple}
                onChange={(e) => setAboutSimple(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 p-4 text-white outline-none focus:border-violet-400"
                rows={8}
                placeholder="Digite o novo texto do sobre nós"
              />
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={handleApply}
                disabled={saving}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                {saving ? "Aplicando..." : "Aplicar template"}
              </button>

              <button
                onClick={() => router.push("/sites")}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 font-semibold text-white/80 hover:bg-white/10"
              >
                Voltar
              </button>
            </div>
          </div>

          {/* PRÉVIA */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-sm font-semibold mb-4">Prévia</div>

            <div className="rounded-2xl bg-white p-8 text-slate-900">
              {/* LOGO */}
              <div className="flex justify-center">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="max-h-36 max-w-full object-contain"
                  />
                ) : (
                  <div className="text-lg font-semibold text-slate-400">Nenhuma logo enviada</div>
                )}
              </div>

              {/* SOBRE NÓS */}
              <div className="mt-12">
                <div className="border-l-4 border-slate-900 pl-4">
                  <h2 className="text-2xl font-black uppercase">Sobre nós</h2>
                </div>

                <div className="mt-6 whitespace-pre-line text-base leading-8 text-slate-700">
                  {aboutSimple || "Seu texto sobre nós aparecerá aqui."}
                </div>
              </div>

              {/* RODAPÉ */}
              <div className="mt-16 border-t border-slate-200 pt-6">
                <div className="whitespace-pre-line text-sm leading-7 text-slate-600">
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
