export const dynamic = "force-dynamic";

export default function StorePage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 text-white">
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Loja</h1>
        <p className="mt-1 text-sm text-white/60">
          Compre perfis, BM verificadas e serviços direto pelo painel.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-xl">
        <iframe
          src="https://loja.plpainel.com/"
          className="h-[85vh] w-full"
          allow="payment *"
        />
      </div>

    </main>
  );
}