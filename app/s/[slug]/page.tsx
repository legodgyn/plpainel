// src/app/s/[slug]/page.tsx

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

function extractMetaContent(input?: string | null) {
  const raw = String(input || "").trim();
  if (!raw) return null;

  // se vier tag completa: <meta ... content="XYZ">
  const m = raw.match(/content\s*=\s*["']([^"']+)["']/i);
  if (m?.[1]) return m[1].trim();

  // se vier só o token
  return raw;
}

function extractMetaName(input?: string | null) {
  const raw = String(input || "").trim();
  if (!raw) return null;

  // se vier tag completa: <meta name="XYZ" ...>
  const m = raw.match(/name\s*=\s*["']([^"']+)["']/i);
  if (m?.[1]) return m[1].trim();

  // se vier só o nome
  return raw;
}

// ✅ BM meta tag dinâmica SEM QUEBRAR (mesmo se colunas não existirem)
export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug } = await Promise.resolve(props.params);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ⚠️ pega tudo pra não quebrar se você renomear/adição de coluna
  const { data } = await supabase
    .from("sites")
    .select("*")
    .eq("slug", slug)
    .eq("is_public", true)
    .single();

  const title = (data?.company_name as string) || "Site público";

  const name = extractMetaName((data?.meta_verify_name as string | null) ?? null);
  const content = extractMetaContent(
    (data?.meta_verify_content as string | null) ?? null
  );

  if (name && content) {
    return {
      title,
      other: {
        [name]: content,
      },
    };
  }

  return { title };
}

export default async function PublicSitePage(props: PageProps) {
  const { slug } = await Promise.resolve(props.params);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ✅ pega tudo pra não quebrar quando você adiciona coluna nova
  const { data, error } = await supabase
    .from("sites")
    .select("*")
    .eq("slug", slug)
    .eq("is_public", true)
    .single();

  if (error || !data) return notFound();

  // normaliza campos (não assume nada como obrigatório)
  const company_name = (data.company_name as string | null) || "Empresa";
  const cnpj = (data.cnpj as string | null) || "—";
  const mission = (data.mission as string | null) || "";
  const phone = (data.phone as string | null) || "";
  const email = (data.email as string | null) || "";
  const instagram = (data.instagram as string | null) || null;
  const whatsapp = (data.whatsapp as string | null) || "";
  const about = (data.about as string | null) || "";
  const privacy = (data.privacy as string | null) || null; // ✅ separado
  const footer = (data.footer as string | null) || "—";

  const igUrl = normalizeInstagram(instagram);
  const waUrl = normalizeWhatsApp(whatsapp);
  const waCta = waWithText(waUrl, "Olá, gostaria de mais informações.");

  return (
    <main className="min-h-screen bg-[#F5F0FA] text-slate-900">
      {/* TOP */}
      <header className="bg-white/90 backdrop-blur border-b border-purple-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full border border-purple-200 text-purple-900 bg-purple-50">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M14 9a3 3 0 10-6 0v1H6a2 2 0 00-2 2v8h16v-8a2 2 0 00-2-2h-2V9z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="leading-tight">
              <div className="text-xs text-slate-500">Página pública</div>
              <div className="text-sm font-semibold text-slate-900">
                {slug}.plpainel.com
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-md bg-purple-800 px-4 py-2 text-sm font-semibold text-white opacity-70"
          >
            LOGIN
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-5xl px-4 pt-10 pb-8">
        <div className="rounded-2xl bg-white border border-purple-200 shadow-sm">
          <div className="p-7 sm:p-10">
            <div className="flex flex-col items-center text-center">
              <div className="grid h-[180px] w-[180px] place-items-center rounded-full bg-purple-800 text-white shadow-sm">
                <span className="text-6xl font-extrabold">
                  {(company_name?.[0] || "E").toUpperCase()}
                </span>
              </div>

              <h1 className="mt-6 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                {company_name}
              </h1>

              <div className="mt-2 text-sm sm:text-base text-slate-700">
                <span className="font-semibold text-slate-900">CNPJ:</span>{" "}
                {cnpj}
              </div>

              {mission ? (
                <div className="mt-8 w-full max-w-3xl rounded-xl bg-white border border-purple-200 p-6 text-left">
                  <div className="text-xs font-extrabold tracking-widest text-purple-700">
                    NOSSA MISSÃO
                  </div>
                  <div className="mt-3 whitespace-pre-line text-sm sm:text-base font-semibold leading-relaxed text-slate-800">
                    {mission}
                  </div>
                </div>
              ) : null}

              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                {waCta ? (
                  <a
                    href={waCta}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md bg-purple-800 px-6 py-3 text-sm font-extrabold text-white hover:bg-purple-900"
                  >
                    CONVERSAR AGORA
                  </a>
                ) : null}

                {igUrl ? (
                  <a
                    href={igUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-purple-300 bg-purple-50 px-6 py-3 text-sm font-extrabold text-purple-900 hover:bg-purple-100"
                  >
                    INSTAGRAM
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="mx-auto max-w-5xl px-4 pb-14">
        {/* Linha 1: Sobre nós + lateral */}
        <div className="grid gap-6 md:grid-cols-[1.4fr_.6fr]">
          {/* Sobre nós */}
          <div className="rounded-2xl bg-white border border-purple-200 shadow-sm p-6 sm:p-7">
            <h2 className="text-lg font-extrabold text-slate-900">QUEM SOMOS?</h2>
            <div className="mt-4 whitespace-pre-line leading-relaxed text-slate-800">
              {about || "—"}
            </div>
          </div>

          {/* Lateral */}
          <div className="space-y-6">
            <div className="rounded-2xl bg-white border border-purple-200 shadow-sm p-6 sm:p-7">
              <h3 className="text-sm font-extrabold tracking-widest text-purple-700">
                CONTATO
              </h3>

              <div className="mt-4 space-y-2 text-sm text-slate-800">
                {phone ? (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">Telefone</span>
                    <span className="font-semibold text-right">{phone}</span>
                  </div>
                ) : null}

                {email ? (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">E-mail</span>
                    <span className="font-semibold text-right">{email}</span>
                  </div>
                ) : null}

                {whatsapp ? (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">WhatsApp</span>
                    <span className="font-semibold text-right">{whatsapp}</span>
                  </div>
                ) : null}
              </div>

              {waCta ? (
                <a
                  href={waCta}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 block rounded-md bg-purple-800 px-5 py-3 text-center text-sm font-extrabold text-white hover:bg-purple-900"
                >
                  FALAR NO WHATSAPP
                </a>
              ) : null}
            </div>

            <div className="rounded-2xl bg-white border border-purple-200 shadow-sm p-6 sm:p-7 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-purple-200 bg-purple-50 text-purple-900">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M12 16a4 4 0 100-8 4 4 0 000 8z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M17.5 6.5h.01"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div className="mt-3 text-sm font-extrabold text-slate-900">
                INSTAGRAM
              </div>

              <a
                href={igUrl || "#"}
                target="_blank"
                rel="noreferrer"
                className={`mt-4 inline-flex items-center justify-center rounded-md px-5 py-3 text-sm font-extrabold ${
                  igUrl
                    ? "bg-purple-50 border border-purple-300 text-purple-900 hover:bg-purple-100"
                    : "pointer-events-none bg-slate-100 text-slate-400"
                }`}
              >
                ACESSAR
              </a>
            </div>
          </div>
        </div>

        {/* Linha 2: Política de Privacidade (separada + estilo missão) */}
        {privacy ? (
          <div className="mt-6">
            <div className="rounded-2xl bg-white border border-purple-200 shadow-sm p-6 sm:p-7">
              <div className="text-xs font-extrabold tracking-widest text-purple-700">
                POLÍTICA DE PRIVACIDADE
              </div>
              <div className="mt-3 whitespace-pre-line text-sm sm:text-base font-semibold leading-relaxed text-slate-800">
                {privacy}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* FOOTER */}
      <footer className="border-t border-purple-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <div className="whitespace-pre-line text-sm text-slate-700">{footer}</div>

          <div className="mt-6">
            <a
              href="https://policies.google.com/privacy?hl=pt-BR"
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold underline underline-offset-4 text-purple-900"
            >
              Políticas de privacidade
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
