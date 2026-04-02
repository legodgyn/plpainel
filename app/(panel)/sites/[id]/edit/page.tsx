"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

function parseMetaTag(input: string) {
  const raw = String(input || "").trim();
  if (!raw) return { name: null, content: null };

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

// 🔥 limpa TXT corretamente
function normalizeTxt(input: string) {
  let txt = input.trim();

  // remove aspas se vier
  txt = txt.replace(/^"+|"+$/g, "");

  // remove duplicação
  txt = txt.replace(
    /^facebook-domain-verification=facebook-domain-verification=/,
    "facebook-domain-verification="
  );

  // se vier só o token
  if (!txt.includes("facebook-domain-verification=")) {
    txt = `facebook-domain-verification=${txt}`;
  }

  return txt;
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
  const [metaTxt, setMetaTxt] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data } = await supabase
        .from("sites")
        .select("*")
        .eq("id", id)
        .single();

      setLoading(false);

      if (!data) return;

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

      if (data.meta_verify_name && data.meta_verify_content) {
        setMetaTag(
          `<meta name="${data.meta_verify_name}" content="${data.meta_verify_content}" />`
        );
      }

      if (data.meta_txt) {
        setMetaTxt(data.meta_txt);
      }
    }

    load();
  }, [id]);

  async function handleSave() {
    setLoading(true);

    const parsedMeta = parseMetaTag(metaTag);
    const cleanTxt = normalizeTxt(metaTxt);

    // 🔥 salva no banco
    await supabase
      .from("sites")
      .update({
        company_name: companyName,
        cnpj,
        mission,
        phone,
        email,
        instagram,
        whatsapp,
        about,
        privacy,
        footer,
        meta_verify_name: parsedMeta.name,
        meta_verify_content: parsedMeta.content,
        meta_txt: cleanTxt,
      })
      .eq("id", id);

    // 🔥 envia pro cloudflare
    try {
      await fetch("/api/cloudflare/txt", {
        method: "POST",
        body: JSON.stringify({
          domain: `${slug}.ehspainel.com.br`,
          txt: cleanTxt,
        }),
      });
    } catch (e) {
      console.log("Erro ao enviar TXT", e);
    }

    setLoading(false);
    router.push("/dashboard");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-white">
      <h1 className="text-2xl font-bold mb-6">Editar Site</h1>

      <div className="space-y-5">

        <input value={companyName} onChange={(e)=>setCompanyName(e.target.value)} placeholder="Empresa" />
        
        {/* META TAG */}
        <div>
          <div className="text-sm">Meta Tag</div>
          <input
            value={metaTag}
            onChange={(e) => setMetaTag(e.target.value)}
            className="w-full"
          />
        </div>

        {/* TXT */}
        <div>
          <div className="text-sm">Verificação via TXT (Cloudflare)</div>
          <input
            value={metaTxt}
            onChange={(e) => setMetaTxt(e.target.value)}
            placeholder="facebook-domain-verification=..."
            className="w-full"
          />
        </div>

        <button onClick={handleSave}>
          {loading ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}
