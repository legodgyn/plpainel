import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-xl w-full rounded-2xl border border-black/10 p-8">
        <h1 className="text-3xl font-bold">plpainel</h1>
        <p className="mt-2 text-black/70">
          Acesse o painel para criar e gerenciar seus sites.
        </p>

        <div className="mt-6 flex gap-3">
          <Link
            className="rounded-xl bg-black text-white px-5 py-3 font-medium"
            href="https://app.plpainel.com/login"
          >
            Ir para o Painel
          </Link>

          <Link
            className="rounded-xl border border-black/10 px-5 py-3 font-medium"
            href="https://app.plpainel.com/register"
          >
            Criar conta
          </Link>
        </div>
      </div>
    </main>
  );
}
