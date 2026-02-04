import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="max-w-lg text-center">
        <h1 className="text-3xl font-bold">plpainel</h1>
        <p className="mt-3 text-gray-600">
          Painel de criação de sites por subdomínio.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg bg-black text-white"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 rounded-lg border border-black"
          >
            Criar conta
          </Link>
        </div>

        <p className="mt-6 text-sm text-gray-500">
          Acesse o painel em <b>app.plpainel.com</b>
        </p>
      </div>
    </main>
  );
}
