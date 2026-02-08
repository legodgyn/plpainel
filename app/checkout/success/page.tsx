import Link from "next/link";

export default function SuccessPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-white">
      <h1 className="text-2xl font-bold">Pagamento aprovado ✅</h1>
      <p className="mt-2 text-white/70">
        Seus tokens serão creditados automaticamente em instantes.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold hover:bg-purple-500"
      >
        Voltar ao Dashboard
      </Link>
    </div>
  );
}
