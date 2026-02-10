import Link from "next/link";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gray-100 border border-gray-200 text-gray-700 font-black text-sm">
              PL
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-gray-900">PL - Painel</div>
              <div className="text-xs text-gray-500">Sites rápidos • BM-safe</div>
            </div>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            <a href="#como-funciona" className="text-sm text-gray-600 hover:text-gray-900">
              Como funciona
            </a>
            <a href="#beneficios" className="text-sm text-gray-600 hover:text-gray-900">
              Benefícios
            </a>
            <a href="#faq" className="text-sm text-gray-600 hover:text-gray-900">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 md:inline-flex"
            >
              Entrar
            </Link>

            <Link
              href="/sites/new"
              className="inline-flex rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
            >
              Criar meu site
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs text-violet-700 font-medium">
              🚀 Crie páginas “BM-safe” em minutos
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 md:text-5xl leading-tight">
              Seu site pronto pra vender <span className="text-violet-600">todos os dias</span>
            </h1>

            <p className="mt-4 text-base text-gray-600 md:text-lg">
              Digite o CNPJ, gere o site automaticamente e publique em segundos. Sem dor de cabeça.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sites/new"
                className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-5 py-3 text-sm font-bold text-white hover:bg-violet-500"
              >
                Criar meu site agora
              </Link>

              <Link
                href="/billing"
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Comprar tokens
              </Link>
            </div>
          </div>

          <div className="w-full">
            <img
              src="https://files.oaiusercontent.com/file-CSZBXnFFC11xJjfqyQwTGu?se=2026-02-10T15%3A58%3A07Z&sp=r&sv=2024-08-04&sr=b&rscc=max-age%3D604800%2C%20immutable%2C%20private&rscd=attachment%3B%20filename%3Df236cf94-ad4e-4a58-b521-3223ea11e9ba.webp&skoid=e0bcdfd3-0492-4107-84d4-2b572e5d7146&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2026-02-10T10%3A27%3A10Z&ske=2026-02-11T10%3A27%3A10Z&sks=b&skv=2024-08-04&sig=V3FM2IBQftz5EYs/mjyFOmmCamRcewShaevuKwqZFh8%3D"
              alt="Automated site creation visual"
              className="rounded-xl shadow-lg border border-gray-200"
            />
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section id="beneficios" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold">O que você ganha com o PL - Painel</h2>
          <p className="mt-2 text-gray-600">Você foca no tráfego. O sistema cuida do resto.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            ["Subdomínio instantâneo", "Seu site no ar em segundos com URL automática."],
            ["Texto automático por CNPJ", "Missão, sobre, privacidade e mais, gerados automaticamente."],
            ["Compra via PIX + tokens", "Pagamento automático. Tokens viram sites."],
            ["BM-safe", "Layout limpo e verificado para performar bem."],
            ["Rápido e leve", "Ideal para tráfego pago. Carrega instantaneamente."],
            ["Escala sem complicação", "Crie dezenas de sites em minutos."],
          ].map(([title, desc]) => (
            <div
              key={title}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <h3 className="font-semibold text-lg text-gray-900">{title}</h3>
              <p className="mt-2 text-sm text-gray-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Como funciona?</h2>
            <p className="mt-2 text-gray-600">Em 3 passos, seu site está no ar</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              ["01", "Digite o CNPJ", "Clique em 'Gerar dados' e pronto, o sistema preenche tudo."],
              ["02", "Ajuste se quiser", "Edite textos, contatos e informações como preferir."],
              ["03", "Publique e venda", "Seu site estará no ar, pronto para conversão."],
            ].map(([n, title, desc]) => (
              <div
                key={n}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="text-xs font-bold text-gray-400 mb-1">{n}</div>
                <h3 className="font-semibold text-lg text-gray-900">{title}</h3>
                <p className="mt-2 text-sm text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Perguntas frequentes</h2>
            <p className="mt-2 text-gray-600">Tire suas dúvidas antes de começar</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {[
              ["Quanto custa criar um site?", "1 token = R$ 4,00. Cada site consome um token."],
              ["O site fica online na hora?", "Sim, publicado automaticamente em poucos segundos."],
              ["Preciso configurar DNS?", "Não. O subdomínio é criado automaticamente via wildcard."],
              ["Posso editar depois?", "Claro! Você pode alterar os textos e configurações a qualquer momento."],
            ].map(([q, a]) => (
              <div key={q} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900">{q}</h3>
                <p className="mt-2 text-sm text-gray-600">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-10">
        <div className="mx-auto max-w-6xl px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <div>© {new Date().getFullYear()} PL - Painel. Todos os direitos reservados.</div>
          <div className="flex gap-4">
            <a href="#beneficios" className="hover:text-gray-700">Benefícios</a>
            <a href="#como-funciona" className="hover:text-gray-700">Como funciona</a>
            <a href="#faq" className="hover:text-gray-700">FAQ</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
