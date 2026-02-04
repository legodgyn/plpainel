import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";

export default async function PublicSitePage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params.slug;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: site } = await supabase
    .from("sites")
    .select("id, slug, status")
    .eq("slug", slug)
    .single();

  if (!site) return notFound();

  // Respeita status (inactive = fora do ar)
  if (site.status !== "active") return notFound();

  const { data: content } = await supabase
    .from("site_content")
    .select("*")
    .eq("site_id", site.id)
    .single();

  if (!content) return notFound();

  // Por enquanto só mostra um “OK” com dados.
  // Na FASE 6 (B) a gente coloca o template BM-safe completo.
  return (
    <main style={{ padding: 24, fontFamily: "Arial" }}>
      <h1>{content.legal_name || site.slug}</h1>
      <p><b>CNPJ:</b> {content.cnpj}</p>
      <p><b>Missão:</b> {content.mission}</p>
      <p><b>Telefone:</b> {content.phone}</p>
      <p><b>Email:</b> {content.email}</p>
      <p><b>WhatsApp:</b> {content.whatsapp}</p>
      <hr style={{ margin: "24px 0" }} />
      <p>OK — rota por subdomínio funcionando ✅</p>
    </main>
  );
}
