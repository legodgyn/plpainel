import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type PageProps = {
  params: { domain: string } | Promise<{ domain: string }>;
};

export const dynamic = "force-dynamic";

export default async function CustomDomainPage(props: PageProps) {
  const { domain } = await Promise.resolve(props.params);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data } = await supabase
    .from("sites")
    .select("*")
    .eq("custom_domain", domain)
    .eq("domain_mode", "custom_domain")
    .eq("is_public", true)
    .maybeSingle();

  if (!data) return notFound();

  return (
    <main className="min-h-screen bg-[#F5F0FA] text-slate-900">
      <section className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-2xl border border-purple-200 bg-white p-8 shadow-sm text-center">
          <h1 className="text-3xl font-extrabold">{data.company_name}</h1>
          <p className="mt-2 text-slate-700">
            <strong>CNPJ:</strong> {data.cnpj || "—"}
          </p>

          {data.mission && (
            <div className="mt-8 rounded-xl border border-purple-200 p-6 text-left">
              <div className="text-xs font-extrabold tracking-widest text-purple-700">
                NOSSA MISSÃO
              </div>
              <div className="mt-3 whitespace-pre-line font-semibold leading-relaxed">
                {data.mission}
              </div>
            </div>
          )}

          <div className="mt-8 rounded-xl border border-purple-200 p-6 text-left">
            <h2 className="font-extrabold">QUEM SOMOS?</h2>
            <div className="mt-3 whitespace-pre-line leading-relaxed">
              {data.about || "—"}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-purple-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-10 whitespace-pre-line text-sm text-slate-700">
          {data.footer || "—"}
        </div>
      </footer>
    </main>
  );
}