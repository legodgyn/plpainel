"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

type SiteRow = {
  id: string;
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [sites, setSites] = useState<SiteRow[]>([]);
  const [siteId, setSiteId] = useState("");
  const [aboutSimple, setAboutSimple] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let alive = true;

    async function load() {
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
        .select("id,slug,company_name,footer,about,about_simple,logo_url,template_type")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!alive) return;

      if (error) {
        setMsg(error.message);
        setSites([]);
        setLoading(false);
        return;
      }

      const rows = (data as SiteRow[]) || [];
      setSites(rows);

      if (rows.length > 0) {
        const first = rows[0];
        setSiteId(first.id);
        setAboutSimple(first.about_simple || first.about || "");
        setLogoUrl(first.logo_url || "");
      }

      setLoading(false);
    }

    load();
    return () => {
      alive = false;
    };
  }, [router]);

  function onSelectSite(nextId: string) {
    setSiteId(nextId);
    const found = sites.find((s) => s.id === nextId);
    setAboutSimple(found?.about_simple || found?.about || "");
    setLogoUrl(found?.logo_url || "");
  }

  async function handleUpload(file: File) {
    setMsg(null);
    setUploading(true);

    try {
      const ext = file.name.split(".").pop() || "png";
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        router.push("/login");
        return;
      }

      const path = `${user.id}/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from("site-assets")
        .upload(path, file, {
          upsert: true,
        });

      if (uploadErr) {
        setMsg(uploadErr.message);
        return;
      }

      const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
      setLogoUrl(data.publicUrl);
    } catch (e: any) {
      setMsg(e?.message || "Erro ao subir imagem.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
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
      const { error } = await supabase
        .from("sites")
        .update({
          template_type: "simple",
          logo_url: logoUrl || null,
          about_simple: aboutSimple.trim(),
        })
        .eq("id", siteId);

      if (error) {
        setMsg(error.message);
        return;
      }

      setMsg("Template simples aplicado com sucesso!");
    } catch (e: any) {
      setMsg(e?.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  const currentSite = sites.find((s) => s.id === siteId);

  return (
    <div className="max-w-5xl text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Template Simples</h1>
          <p className="mt-1 text-sm text-white/60">
            Atualize um site já criado usando o mesmo domínio, com logo, sobre nós e rodapé.
          </p>
        </div>
      </div>

      {msg && (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            msg.toLowerCase().includes("sucesso")
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/20 bg-red-500/10 text-red-200"
          }`}
        >
          {msg}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div>
            <label className="text-xs text-white/70">Escolha o site</label>
            <select
              value={siteId}
              onChange={(e) => onSelectSite(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-violet-400"
            >
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.slug}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <label className="text-xs text-white/70">Upload da logo</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
              className="mt-1 block w-full text-sm text-white/70 file:mr-4 file:rounded-lg file:border-0 file:bg-violet-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-violet-500"
            />
            {uploading && <div className="mt-2 text-xs text-white/50">Subindo imagem...</div>}
          </div>

          {logoUrl ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs text-white/60">Prévia da logo</div>
              <img src={logoUrl} alt="Logo" className="mt-3 max-h-40 object-contain" />
            </div>
          ) : null}

          <div className="mt-4">
            <label className="text-xs text-white/70">Sobre nós</label>
            <textarea
              value={aboutSimple}
              onChange={(e) => setAboutSimple(e.target.value)}
              rows={8}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 outline-none focus:border-violet-400"
            />
          </div>

          <div className="mt-5 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Aplicar template"}
            </button>

            <button
              onClick={() => router.push("/sites")}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
            >
              Voltar
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold">Prévia</div>

          <div className="mt-5 min-h-[520px] rounded-2xl bg-white p-6 text-black">
            <div className="flex justify-center">
              <div className="flex h-36 w-64 items-center justify-center border-4 border-black">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="max-h-28 max-w-[220px] object-contain" />
                ) : (
                  <span className="text-4xl font-black">LOGO</span>
                )}
              </div>
            </div>

            <div className="mt-10 border-4 border-black p-5">
              <div className="text-4xl font-black uppercase">Sobre nós</div>
            </div>

            <div className="mt-8 min-h-[140px] text-base leading-relaxed whitespace-pre-line">
              {aboutSimple || "Seu texto sobre nós aparecerá aqui."}
            </div>

            <div className="mt-12 border-4 border-black p-4 text-center">
              <div className="text-3xl font-black uppercase">Rodapé</div>
              <div className="mt-3 text-sm leading-relaxed whitespace-pre-line">
                {currentSite?.footer || "Rodapé do site"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}