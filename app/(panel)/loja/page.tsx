export const dynamic = "force-dynamic";

export default function StorePage() {
  return (

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-xl">
        <iframe
          src="https://loja.plpainel.com/"
          className="h-[85vh] w-full"
          allow="payment *"
        />
      </div>
  );
}
