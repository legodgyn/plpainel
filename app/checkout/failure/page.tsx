import Link from "next/link";

export default async function FailurePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-xl px-5 py-10">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-2xl font-bold">Pagamento não concluído</h1>
          <p className="mt-2 text-white/70">
            Não foi possível finalizar seu pagamento. Você pode tentar novamente.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/billing"
              className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold hover:bg-purple-500"
            >
              Tentar novamente
            </Link>

            <Link
              href="/dashboard"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
            >
              Voltar ao dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
