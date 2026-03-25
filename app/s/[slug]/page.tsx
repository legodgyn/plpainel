import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type PageProps = {
  params: { slug: string } | Promise<{ slug: string }>;
};

function onlyDigits(v: string) {
  return String(v || "").replace(/\D/g, "");
}

function normalizeInstagram(v?: string | null) {
  const raw = String(v || "").trim();
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  const handle = raw.replace(/^@/, "").trim();
  return `https://instagram.com/${handle}`;
}

function normalizeWhatsApp(v?: string | null) {
  const digits = onlyDigits(String(v || ""));
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

function waWithText(waUrl: string | null, text: string) {
  if (!waUrl) return null;
  return `${waUrl}?text=${encodeURIComponent(text)}`;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug } = await Promise.resolve(props.params);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data } = await supabase
    .from("sites")
    .select("company_name, base_domain")
    .eq("slug", slug)
    .eq("is_public", true)
    .single();

  return {
    title: data?.company_name || "Site público",
  };
}

export default async function PublicSitePage(props: PageProps) {
  const { slug } = await Promise.resolve(props.params);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("sites")
    .select("*")
    .eq("slug", slug)
    .eq("is_public", true)
    .single();

  if (error || !data) return notFound();

  const base_domain =
    (data.base_domain as string | null) || "plpainel.com";

  const company_name = data.company_name || "Empresa";
  const cnpj = data.cnpj || "—";
  const mission = data.mission || "";
  const phone = data.phone || "";
  const email = data.email || "";
  const instagram = data.instagram || null;
  const whatsapp = data.whatsapp || "";
  const about = data.about || "";
  const about_simple = data.about_simple || "";
  const logo_url = data.logo_url || "";
  const template_type = data.template_type || "default";
  const simple_title = data.simple_title || "";
  const privacy = data.privacy || null;
  const footer = data.footer || "—";

  const igUrl = normalizeInstagram(instagram);
  const waUrl = normalizeWhatsApp(whatsapp);
  const waCta = waWithText(waUrl, "Olá, gostaria de mais informações.");

  // =========================
  // TEMPLATE SIMPLES
  // =========================
  if (template_type === "simple") {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center px-4 py-12">
          {logo_url && (
            <img
              src={logo_url}
              alt={company_name}
              className="w-[220px] object-contain"
            />
          )}

          <h1 className="mt-8 text-center text-2xl font-bold">
            Quem é {simple_title || company_name}?
          </h1>

          <div className="mt-8 max-w-3xl text-center">
            <p className="whitespace-pre-line text-sm text-gray-200">
              {about_simple || about || "—"}
            </p>
          </div>
        </div>

        <footer className="mt-16 bg-blue-700 px-6 py-8 text-center text-sm text-white">
          {footer}
        </footer>
      </main>
    );
  }

  // =========================
  // TEMPLATE PADRÃO
  // =========================
  return (
    <main className="min-h-screen bg-[#F5F0FA] text-slate-900">
      <header className="bg-white border-b border-purple-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <div className="text-xs text-slate-500">Página pública</div>
            <div className="text-sm font-semibold">
              {slug}.{base_domain}
            </div>
          </div>

          <button
            disabled
            className="rounded-md bg-purple-800 px-4 py-2 text-sm text-white opacity-70"
          >
            LOGIN
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 pt-10">
        <div className="rounded-2xl bg-white border border-purple-200 p-8 text-center">
          <h1 className="text-3xl font-bold">{company_name}</h1>

          <div className="mt-2 text-sm">
            <b>CNPJ:</b> {cnpj}
          </div>

          <div className="mt-6 flex justify-center gap-3">
            {waCta && (
              <a
                href={waCta}
                target="_blank"
                className="bg-purple-800 text-white px-6 py-3 rounded-md"
              >
                CONVERSAR
              </a>
            )}

            {igUrl && (
              <a
                href={igUrl}
                target="_blank"
                className="border px-6 py-3 rounded-md"
              >
                INSTAGRAM
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 mt-10">
        <div className="rounded-2xl bg-white border p-6">
          <h2 className="font-bold">QUEM SOMOS?</h2>
          <div className="mt-3 whitespace-pre-line">{about}</div>
        </div>
      </section>

      {privacy && (
        <section className="mx-auto max-w-5xl px-4 mt-6">
          <div className="rounded-2xl bg-white border p-6">
            <h2 className="font-bold">POLÍTICA DE PRIVACIDADE</h2>
            <div className="mt-3 whitespace-pre-line">{privacy}</div>
          </div>
        </section>
      )}

      <footer className="mt-10 border-t bg-white p-6 text-sm text-center">
        {footer}
      </footer>
    </main>
  );
}
