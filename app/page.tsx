import Link from "next/link";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#070712] text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070712]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 border border-white/10">
              <span className="text-sm font-black">PL</span>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">PL - Painel</div>
              <div className="text-[11px] text-white/50">Sites rápidos • BM-safe</div>
            </div>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            <a href="#como-funciona" className="text-sm text-white/70 hover:text-white">
              Como funciona
            </a>
            <a href="#beneficios" className="text-sm text-white/70 hover:text-white">
              Benefícios
            </a>
            <a href="#planos" className="text-sm text-white/70 hover:text-white">
              Planos
            </a>
            <a href="#faq" className="text-sm text-white/70 hover:text-white">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 md:inline-flex"
            >
              Entrar
            </Link>

            <Link
              href="/sites/new"
              className="inline-flex rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
            >
              Criar meu site
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -top-20 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-violet-700/20 blur-3xl" />
          <div className="absolute top-40 right-[-120px] h-[340px] w-[340px] rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute top-52 left-[-140px] h-[340px] w-[340px] rounded-full bg-blue-500/10 blur-3xl" />
        </div>

        <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Crie páginas “BM-safe” em minutos
              </div>

              <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight md:text-5xl">
                Seu site pronto, bonito e validado pra{" "}
                <span className="text-violet-300">vender todo dia</span>.
              </h1>

              <p className="mt-4 text-base text-white/70 md:text-lg">
                Digite o CNPJ, gere o site automaticamente e publique em subdomínio na hora.
                Sem dor de cabeça. Sem enrolação.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/sites/new"
                  className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white hover:bg-violet-500"
                >
                  Criar meu site agora
                </Link>

                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80 hover:bg-white/10"
                >
                  Ver planos
                </Link>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-white/60 md:max-w-md">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  ✅ Subdomínio automático
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  ✅ Templates prontos
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  ✅ PIX integrado
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  ✅ Painel + tokens
                </div>
              </div>
            </div>

            {/* Mock / card */}
            <div className="relative">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,.45)]">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Prévia do seu site</div>
                  <div className="text-xs text-white/50">slug.plpainel.com</div>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="h-10 w-3/4 rounded-xl bg-white/10" />
                  <div className="h-4 w-full rounded-lg bg-white/10" />
                  <div className="h-4 w-5/6 rounded-lg bg-white/10" />
                  <div className="h-4 w-2/3 rounded-lg bg-white/10" />

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="h-3 w-24 rounded bg-white/10" />
                      <div className="mt-3 h-7 w-full rounded-xl bg-emerald-500/20" />
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="h-3 w-28 rounded bg-white/10" />
                      <div className="mt-3 h-7 w-full rounded-xl bg-violet-500/20" />
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs font-semibold text-white/70">Gerado por CNPJ</div>
                    <div className="mt-2 h-4 w-4/5 rounded bg-white/10" />
                    <div className="mt-2 h-4 w-3/5 rounded bg-white/10" />
                  </div>
                </div>
              </div>

              <div className="pointer-events-none absolute -bottom-8 -right-6 hidden h-28 w-28 rounded-3xl border border-white/10 bg-emerald-500/10 blur-[1px] md:block" />
            </div>
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section id="beneficios" className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="text-xs font-semibold text-violet-300">Benefícios</div>
            <h2 className="mt-2 text-2xl font-bold md:text-3xl">
              O que você ganha usando o PL - Painel
            </h2>
            <p className="mt-2 text-white/60">
              Você foca no tráfego e na venda. O resto é automático.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Subdomínio instantâneo",
              desc: "O cliente cria o site e já fica no ar em slug.plpainel.com.",
            },
            {
              title: "Texto automático por CNPJ",
              desc: "Missão, Sobre, Privacidade e Rodapé gerados no template.",
            },
            {
              title: "Painel com tokens",
              desc: "Controle total: compra via PIX + saldo de criação de sites.",
            },
            {
              title: "BM-safe (estrutura limpa)",
              desc: "Template simples, objetivo e com verificação por meta tag.",
            },
            {
              title: "Rápido e leve",
              desc: "Páginas carregam rápido (ótimo pra anúncio e conversão).",
            },
            {
              title: "Escala sem complicação",
              desc: "Cria 10, 50, 100 sites. Tudo organizado no painel.",
            },
          ].map((b) => (
            <div
              key={b.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <div className="text-base font-semibold">{b.title}</div>
              <p className="mt-2 text-sm text-white/65">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="mx-auto max-w-6xl px-4 py-14">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="text-xs font-semibold text-emerald-300">Como funciona</div>
          <h2 className="mt-2 text-2xl font-bold md:text-3xl">3 passos e tá no ar</h2>

          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {[
              {
                n: "01",
                title: "Digite o CNPJ",
                desc: "Clique em “Gerar dados” e o sistema preenche tudo.",
              },
              {
                n: "02",
                title: "Ajuste o que quiser",
                desc: "Edite missão, sobre nós, privacidade, rodapé e contatos.",
              },
              {
                n: "03",
                title: "Publicou. Vendeu.",
                desc: "Seu site fica em slug.plpainel.com pronto pro tráfego.",
              },
            ].map((s) => (
              <div
                key={s.n}
                className="rounded-2xl border border-white/10 bg-black/20 p-5"
              >
                <div className="text-xs font-bold text-white/60">{s.n}</div>
                <div className="mt-2 text-base font-semibold">{s.title}</div>
                <p className="mt-2 text-sm text-white/65">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/sites/new"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-500"
            >
              Começar agora
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80 hover:bg-white/10"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="text-xs font-semibold text-violet-300">Planos</div>
            <h2 className="mt-2 text-2xl font-bold md:text-3xl">
              Simples, direto e escalável
            </h2>
            <p className="mt-2 text-white/60">
              Comece pequeno e vá aumentando conforme vender.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {/* Starter */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="text-sm font-semibold">Starter</div>
            <div className="mt-2 text-3xl font-black">R$ 39</div>
            <div className="text-xs text-white/60">por pacote de tokens</div>
            <ul className="mt-5 space-y-2 text-sm text-white/70">
              <li>✅ Sites em subdomínio</li>
              <li>✅ Geração por CNPJ</li>
              <li>✅ Templates prontos</li>
              <li>✅ Painel completo</li>
            </ul>
            <Link
              href="/billing"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
            >
              Comprar tokens
            </Link>
          </div>

          {/* Pro */}
          <div className="rounded-3xl border border-violet-400/25 bg-violet-500/10 p-6 shadow-[0_20px_60px_rgba(0,0,0,.4)]">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-black/20 px-3 py-1 text-xs text-violet-200">
              Mais vendido
            </div>
            <div className="mt-3 text-sm font-semibold">Pro</div>
            <div className="mt-2 text-3xl font-black">R$ 99</div>
            <div className="text-xs text-white/60">ideal pra quem escala</div>
            <ul className="mt-5 space-y-2 text-sm text-white/70">
              <li>✅ Tudo do Starter</li>
              <li>✅ Mais tokens por compra</li>
              <li>✅ Melhor custo-benefício</li>
              <li>✅ Prioridade de suporte</li>
            </ul>
            <Link
              href="/billing"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-500"
            >
              Quero esse
            </Link>
          </div>

          {/* Enterprise */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="text-sm font-semibold">Enterprise</div>
            <div className="mt-2 text-3xl font-black">Sob consulta</div>
            <div className="text-xs text-white/60">pra operação grande</div>
            <ul className="mt-5 space-y-2 text-sm text-white/70">
              <li>✅ Alto volume</li>
              <li>✅ Ajustes sob medida</li>
              <li>✅ Integrações</li>
              <li>✅ Onboarding</li>
            </ul>
            <a
              href="https://wa.me/"
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
            >
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-6xl px-4 py-14">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="text-xs font-semibold text-emerald-300">FAQ</div>
          <h2 className="mt-2 text-2xl font-bold md:text-3xl">
            Perguntas que você vai fazer antes de comprar
          </h2>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              {
                q: "O site fica online na hora mesmo?",
                a: "Sim. O subdomínio já aponta pro seu servidor e o PL entrega o conteúdo pelo slug.",
              },
              {
                q: "Preciso configurar DNS pra cada cliente?",
                a: "Não. Com o wildcard (*.plpainel.com) você não cria subdomínio um por um.",
              },
              {
                q: "Posso editar depois?",
                a: "Sim. Você ajusta os textos e dados no painel quando quiser.",
              },
              {
                q: "Funciona com PIX e confirma automaticamente?",
                a: "Sim. Você já integrou o webhook e confirma o pagamento automático.",
              },
            ].map((f) => (
              <div key={f.q} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="text-sm font-semibold">{f.q}</div>
                <p className="mt-2 text-sm text-white/65">{f.a}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/sites/new"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-500"
            >
              Criar meu site agora
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80 hover:bg-white/10"
            >
              Entrar no painel
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-white/60">
              © {new Date().getFullYear()} PL - Painel. Todos os direitos reservados.
            </div>
            <div className="flex gap-4 text-sm text-white/60">
              <a href="#beneficios" className="hover:text-white">Benefícios</a>
              <a href="#como-funciona" className="hover:text-white">Como funciona</a>
              <a href="#planos" className="hover:text-white">Planos</a>
              <a href="#faq" className="hover:text-white">FAQ</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
