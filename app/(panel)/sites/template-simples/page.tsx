"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { useRouter } from "next/navigation";

export default function TemplateSimplePage() {
  const router = useRouter();

  const [sites, setSites] = useState<any[]>([]);
  const [siteId, setSiteId] = useState("");
  const [aboutSimple, setAboutSimple] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [currentSite, setCurrentSite] = useState<any>(null);

  useEffect(() => {
    loadSites();
  }, []);

  async function loadSites() {
    const { data } = await supabase
      .from("sites")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setSites(data);
  }

  async function handleApply() {
    if (!siteId) return;

    let uploadedLogo = logoUrl;

    if (logoFile) {
      const fileName = `${Date.now()}-${logoFile.name}`;

      const { data, error } = await supabase.storage
        .from("site-assets")
        .upload(fileName, logoFile);

      if (error) {
        alert(error.message);
        return;
      }

      const { data: url } = supabase.storage
        .from("site-assets")
        .getPublicUrl(data.path);

      uploadedLogo = url.publicUrl;
    }

    const { error } = await supabase
      .from("sites")
      .update({
        template_type: "simple",
        logo_url: uploadedLogo,
        about_simple: aboutSimple,
      })
      .eq("id", siteId);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Template aplicado!");
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 text-white">
      <h1 className="text-2xl font-bold">Template Simples</h1>

      <div className="mt-6 grid gap-6 md:grid-cols-2">

        {/* FORM */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="text-sm text-white/60 mb-4">
            Atualize um site já criado usando o mesmo domínio.
          </div>

          <label className="text-sm">Escolha o site</label>

          <select
            value={siteId}
            onChange={(e) => {
              setSiteId(e.target.value);
              const s = sites.find((x) => x.id === e.target.value);
              setCurrentSite(s);
            }}
            className="mt-1 w-full rounded-lg bg-black/30 p-2"
          >
            <option value="">Selecione</option>

            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.slug}
              </option>
            ))}
          </select>

          <div className="mt-4">
            <label className="text-sm">Upload da logo</label>

            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setLogoFile(file);
                  setLogoUrl(URL.createObjectURL(file));
                }
              }}
              className="mt-1 block"
            />
          </div>

          <div className="mt-4">
            <label className="text-sm">Sobre nós</label>

            <textarea
              value={aboutSimple}
              onChange={(e) => setAboutSimple(e.target.value)}
              className="mt-1 w-full rounded-lg bg-black/30 p-3"
              rows={6}
            />
          </div>

          <button
            onClick={handleApply}
            className="mt-4 rounded-lg bg-green-600 px-5 py-2 font-semibold"
          >
            Aplicar template
          </button>
        </div>

        {/* PRÉVIA */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="text-sm font-semibold mb-4">Prévia</div>

          <div className="rounded-lg bg-white p-6 text-black">

            {/* LOGO */}
            <div className="flex justify-center">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  className="max-h-36 object-contain"
                />
              ) : (
                <div className="text-gray-400">Logo</div>
              )}
            </div>

            {/* SOBRE */}
            <div className="mt-10">
              <h2 className="text-2xl font-bold">Sobre nós</h2>

              <div className="mt-3 whitespace-pre-line text-gray-700">
                {aboutSimple || "Texto sobre nós aparecerá aqui."}
              </div>
            </div>

            {/* RODAPÉ */}
            <div className="mt-12 border-t pt-4 text-sm text-gray-600 whitespace-pre-line">
              {currentSite?.footer || "Rodapé do site"}
            </div>

          </div>
        </div>

      </div>
    </main>
  );
}
