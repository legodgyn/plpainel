import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  const SUPPORT_WHATSAPP = "5562999994162";
  const SUPPORT_TEXT = encodeURIComponent(
    "Olá! Vim pelo PL - Painel e gostaria de entrar em contato para saber mais."
  );
  const SUPPORT_LINK = `https://wa.me/${SUPPORT_WHATSAPP}?text=${SUPPORT_TEXT}`;

  const benefits = [
    {
      title: "Subdomínio instantâneo",
      desc: "Crie o site e publique em segundos com um endereço pronto para uso.",
      icon: "🌐",
    },
    {
      title: "Conteúdo automático",
      desc: "Textos essenciais são gerados a partir do CNPJ para acelerar sua entrega.",
      icon: "⚡",
    },
    {
      title: "Fluxo simples com token",
      desc: "Compre via PIX, receba seus tokens e gere sites sem mensalidade.",
      icon: "💳",
    },
    {
      title: "Estrutura pronta para uso",
      desc: "Layout limpo, organizado e pensado para facilitar publicação e validação.",
      icon: "🛡️",
    },
    {
      title: "Rápido e responsivo",
      desc: "Páginas leves, bonitas e preparadas para uma boa experiência em qualquer tela.",
      icon: "📱",
    },
    {
      title: "Escala com facilidade",
      desc: "Gerencie vários sites em um único painel, sem complicação.",
      icon: "📈",
    },
  ];

  const steps = [
    {
      n: "01",
      title: "Informe o CNPJ",
      desc: "O sistema busca as informações e prepara a base do seu site automaticamente.",
    },
    {
      n: "02",
      title: "Personalize os detalhes",
      desc: "Edite textos, contatos e ajustes finais para deixar tudo com a sua cara.",
    },
    {
      n: "03",
      title: "Publique na hora",
      desc: "Seu site entra no ar em um subdomínio pronto para compartilhar e validar.",
    },
  ];

  const faqs = [
    {
      q: "Quanto custa criar um site?",
      a: "Cada site utiliza 1 token. Hoje, 1 token custa R$ 4,00.",
    },
    {
      q: "O site fica online na hora?",
      a: "Sim. Assim que o processo é concluído, o site já fica disponível no subdomínio gerado.",
    },
    {
      q: "Preciso contratar domínio ou hospedagem?",
      a: "Não. A estrutura necessária para publicar o site já está incluída no processo.",
    },
    {
      q: "Posso editar depois?",
      a: "Sim. Você pode ajustar textos, contatos e outros dados sempre que precisar.",
    },
  ];

  return (
    <main className="min-h-screen bg-[#F6F7FB] text-[#1C1B1F]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-120px] top-[-80px] h-[320px] w-[320px] rounded-full bg-[#D0BCFF]/35 blur-3xl" />
        <div className="absolute right-[-120px] top-[120px] h-[360px] w-[360px] rounded-full bg-[#B3C5FF]/30 blur-3xl" />
        <div className="absolute bottom-[-140px] left-1/2 h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-[#E8DEF8]/60 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#E7E0EC] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-icon.png"
              alt="PL Painel"
              width={44}
              height={44}
              className="h-11 w-11 rounded-2xl object-cover ring-1 ring-[#E7E0EC]"
            />
            <div className="leading-tight">
              <div className="text-sm font-semibold text-[#1C1B1F]">PL - Painel</div>
              <div className="text-xs text-[#625B71]">Criação rápida de sites com cara de SaaS</div>
            </div>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            <a
              href="#como-funciona"
              className="text-sm font-medium text-[#625B71] transition hover:text-[#1C1B1F]"
            >
              Como funciona
            </a>
            <a
              href="#beneficios"
              className="text-sm font-medium text-[#625B71] transition hover:text-[#1C1B1F]"
            >
              Benefícios
            </a>
            <a
              href="#preco"
              className="text-sm font-medium text-[#625B71] transition hover:text-[#1C1B1F]"
            >
              Preço
            </a>
            <a
              href="#faq"
              className="text-sm font-medium text-[#625B71] transition hover:text-[#1C1B1F]"
            >
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={SUPPORT_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden rounded-full border border-[#D0C9D6] bg-white px-4 py-2 text-sm font-semibold text-[#6750A4] shadow-sm transition hover:border-[#C4B8D0] hover:bg-[#F8F5FF] md:inline-flex"
            >
              Falar no WhatsApp
            </a>

            <Link
              href="/login"
              className="hidden rounded-full border border-[#D0C9D6] bg-[#F3EDF7] px-4 py-2 text-sm font-semibold text-[#6750A4] transition hover:bg-[#E8DEF8] md:inline-flex"
            >
              Entrar
            </Link>

            <Link
              href="/sites/new"
              className="inline-flex rounded-full bg-[#6750A4] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(103,80,164,0.28)] transition hover:bg-[#5D4797]"
            >
              Criar meu site
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-4 pb-14 pt-14 md:px-6 md:pb-20 md:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <div className="inline-flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#E7E0EC] bg-white px-3 py-1 text-xs font-semibold text-[#625B71] shadow-sm">
                  Plataforma moderna para criação de sites
                </span>
                <span className="rounded-full bg-[#E8DEF8] px-3 py-1 text-xs font-semibold text-[#6750A4]">
                  1 token = R$ 4,00 por site
                </span>
              </div>

              <h1 className="mt-5 max-w-2xl text-4xl font-black leading-tight tracking-[-0.03em] text-[#1C1B1F] md:text-5xl lg:text-6xl">
                Crie sites profissionais em minutos com uma experiência clara,
                rápida e pronta para escalar.
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-[#625B71] md:text-lg">
                Gere páginas automaticamente a partir do CNPJ, personalize os
                detalhes e publique com rapidez em um painel simples, moderno e
                feito para parecer um verdadeiro produto SaaS.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/sites/new"
                  className="inline-flex items-center justify-center rounded-full bg-[#6750A4] px-6 py-3.5 text-sm font-bold text-white shadow-[0_12px_32px_rgba(103,80,164,0.30)] transition hover:bg-[#5D4797]"
                >
                  Criar meu site agora
                </Link>

                <a
                  href="#preco"
                  className="inline-flex items-center justify-center rounded-full border border-[#D0C9D6] bg-white px-6 py-3.5 text-sm font-semibold text-[#6750A4] shadow-sm transition hover:bg-[#F8F5FF]"
                >
                  Ver preço do token
                </a>
              </div>

              <div className="mt-8 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-3xl border border-[#E7E0EC] bg-white p-4 shadow-sm">
                  <div className="text-sm font-semibold text-[#1C1B1F]">Publicação rápida</div>
                  <div className="mt-1 text-sm text-[#625B71]">Seu site pronto em poucos passos</div>
                </div>
                <div className="rounded-3xl border border-[#E7E0EC] bg-white p-4 shadow-sm">
                  <div className="text-sm font-semibold text-[#1C1B1F]">Fluxo simples</div>
                  <div className="mt-1 text-sm text-[#625B71]">Sem mensalidade e sem complexidade</div>
                </div>
                <div className="rounded-3xl border border-[#E7E0EC] bg-white p-4 shadow-sm">
                  <div className="text-sm font-semibold text-[#1C1B1F]">Visual moderno</div>
                  <div className="mt-1 text-sm text-[#625B71]">Experiência com cara de SaaS</div>
                </div>
              </div>
            </div>

            {/* Product mock */}
            <div className="relative">
              <div className="rounded-[32px] border border-[#E7E0EC] bg-white p-4 shadow-[0_20px_60px_rgba(31,28,36,0.10)] md:p-5">
                <div className="rounded-[28px] border border-[#EEE7F2] bg-[#FCFCFF] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-[#1C1B1F]">Painel do seu site</div>
                      <div className="mt-1 text-xs text-[#625B71]">
                        seu-site.plpainel.com
                      </div>
                    </div>
                    <div className="rounded-full bg-[#E8DEF8] px-3 py-1 text-xs font-semibold text-[#6750A4]">
                      Online
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-[24px] border border-[#E7E0EC] bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#625B71]">
                            Site gerado
                          </div>
                          <div className="mt-2 text-xl font-bold text-[#1C1B1F]">
                            Empresa criada com sucesso
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[#625B71]">
                            Página criada automaticamente com dados do CNPJ,
                            estrutura pronta e textos organizados.
                          </p>
                        </div>
                        <div className="rounded-2xl bg-[#F3EDF7] px-3 py-2 text-xs font-semibold text-[#6750A4]">
                          +1 token
                        </div>
                      </div>

                      <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-[#F8F5FF] p-4">
                          <div className="text-xs font-semibold text-[#625B71]">
                            Status
                          </div>
                          <div className="mt-2 text-base font-bold text-[#1C1B1F]">
                            Publicado
                          </div>
                          <div className="mt-1 text-sm text-[#625B71]">
                            Pronto para compartilhar
                          </div>
                        </div>

                        <div className="rounded-2xl bg-[#EEF4FF] p-4">
                          <div className="text-xs font-semibold text-[#625B71]">
                            Origem dos dados
                          </div>
                          <div className="mt-2 text-base font-bold text-[#1C1B1F]">
                            CNPJ automático
                          </div>
                          <div className="mt-1 text-sm text-[#625B71]">
                            Base inicial preenchida
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-[#E7E0EC] bg-white p-5 shadow-sm">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#625B71]">
                        Resumo
                      </div>

                      <div className="mt-4 space-y-3">
                        <div className="rounded-2xl bg-[#F6F2FF] p-4">
                          <div className="text-xs text-[#625B71]">Templates disponíveis</div>
                          <div className="mt-1 text-2xl font-black text-[#1C1B1F]">12+</div>
                        </div>

                        <div className="rounded-2xl bg-[#F7F7FB] p-4">
                          <div className="text-xs text-[#625B71]">Tempo de criação</div>
                          <div className="mt-1 text-2xl font-black text-[#1C1B1F]">Minutos</div>
                        </div>

                        <div className="rounded-2xl bg-[#EEF7F1] p-4">
                          <div className="text-xs text-[#625B71]">Publicação</div>
                          <div className="mt-1 text-2xl font-black text-[#1C1B1F]">Instantânea</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[24px] border border-[#E7E0EC] bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-[#1C1B1F]">
                          Fluxo de criação simples
                        </div>
                        <div className="mt-1 text-sm text-[#625B71]">
                          Gere, revise e publique sem sair do painel.
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-[#E8DEF8] px-3 py-1 text-xs font-semibold text-[#6750A4]">
                          CNPJ
                        </span>
                        <span className="rounded-full bg-[#F3EDF7] px-3 py-1 text-xs font-semibold text-[#6750A4]">
                          Template
                        </span>
                        <span className="rounded-full bg-[#EEF4FF] px-3 py-1 text-xs font-semibold text-[#355CA8]">
                          Publicado
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -left-4 top-8 hidden rounded-3xl border border-[#E7E0EC] bg-white px-4 py-3 shadow-lg md:block">
                <div className="text-xs text-[#625B71]">Tokens disponíveis</div>
                <div className="mt-1 text-lg font-bold text-[#1C1B1F]">24</div>
              </div>

              <div className="absolute -bottom-5 right-3 hidden rounded-3xl border border-[#E7E0EC] bg-white px-4 py-3 shadow-lg md:block">
                <div className="text-xs text-[#625B71]">Novo site criado</div>
                <div className="mt-1 text-sm font-semibold text-[#1C1B1F]">
                  sucesso@plpainel.com
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="beneficios" className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
        <div className="max-w-2xl">
          <div className="inline-flex rounded-full bg-[#E8DEF8] px-3 py-1 text-xs font-semibold text-[#6750A4]">
            Benefícios
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-[-0.02em] text-[#1C1B1F] md:text-4xl">
            Tudo o que você precisa para criar e publicar com mais velocidade
          </h2>
          <p className="mt-3 text-base leading-7 text-[#625B71]">
            Uma experiência simples, visualmente moderna e pensada para transformar
            sua criação de sites em um processo muito mais prático.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="rounded-[28px] border border-[#E7E0EC] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3EDF7] text-2xl">
                {b.icon}
              </div>
              <h3 className="mt-5 text-lg font-bold text-[#1C1B1F]">{b.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#625B71]">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="preco" className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
        <div className="rounded-[36px] border border-[#E7E0EC] bg-white p-6 shadow-sm md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="inline-flex rounded-full bg-[#E8DEF8] px-3 py-1 text-xs font-semibold text-[#6750A4]">
                Preço simples
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.02em] text-[#1C1B1F] md:text-4xl">
                Sem plano mensal, sem burocracia e sem complicação
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#625B71]">
                Você compra tokens, usa quando quiser e gera seus sites conforme a
                necessidade do seu fluxo.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[28px] bg-[#F8F5FF] p-6">
                  <div className="text-sm font-semibold text-[#625B71]">Regra atual</div>
                  <div className="mt-2 text-4xl font-black tracking-[-0.03em] text-[#1C1B1F]">
                    1 Token = R$ 4,00
                  </div>
                  <div className="mt-3 text-sm text-[#625B71]">
                    Cada token equivale à criação de 1 site.
                  </div>
                </div>

                <div className="rounded-[28px] bg-[#F6F7FB] p-6">
                  <div className="text-sm font-semibold text-[#625B71]">Ideal para</div>
                  <div className="mt-2 text-xl font-bold text-[#1C1B1F]">
                    Criar com liberdade
                  </div>
                  <div className="mt-3 text-sm text-[#625B71]">
                    Gere 1, 10 ou 100 sites sem depender de assinatura recorrente.
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-[#E7E0EC] bg-[#FCFCFF] p-6 shadow-sm">
              <div className="text-sm font-semibold text-[#625B71]">Comece agora</div>
              <div className="mt-3 text-2xl font-black text-[#1C1B1F]">
                Plataforma pronta para uso
              </div>
              <p className="mt-3 text-sm leading-6 text-[#625B71]">
                Gere seu primeiro site agora mesmo e experimente um fluxo mais
                leve, organizado e com visual profissional.
              </p>

              <div className="mt-6 flex flex-col gap-3">
                <Link
                  href="/sites/new"
                  className="inline-flex items-center justify-center rounded-full bg-[#6750A4] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_28px_rgba(103,80,164,0.26)] transition hover:bg-[#5D4797]"
                >
                  Criar meu site
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full border border-[#D0C9D6] bg-white px-5 py-3 text-sm font-semibold text-[#6750A4] transition hover:bg-[#F8F5FF]"
                >
                  Entrar no painel
                </Link>
              </div>

              <div className="mt-6 rounded-2xl bg-[#EEF7F1] p-4 text-sm text-[#3D5E49]">
                Sem mensalidade. Você paga apenas pelo que usar.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
        <div className="max-w-2xl">
          <div className="inline-flex rounded-full bg-[#E8DEF8] px-3 py-1 text-xs font-semibold text-[#6750A4]">
            Como funciona
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-[-0.02em] text-[#1C1B1F] md:text-4xl">
            Três passos para colocar seu site no ar
          </h2>
          <p className="mt-3 text-base leading-7 text-[#625B71]">
            Um processo simples para você sair da ideia e chegar na publicação com
            muito menos esforço.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.n}
              className="rounded-[28px] border border-[#E7E0EC] bg-white p-6 shadow-sm"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3EDF7] text-sm font-black text-[#6750A4]">
                {s.n}
              </div>
              <h3 className="mt-5 text-lg font-bold text-[#1C1B1F]">{s.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#625B71]">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/sites/new"
            className="inline-flex items-center justify-center rounded-full bg-[#6750A4] px-6 py-3.5 text-sm font-bold text-white shadow-[0_10px_28px_rgba(103,80,164,0.28)] transition hover:bg-[#5D4797]"
          >
            Começar agora
          </Link>
          <a
            href="#preco"
            className="inline-flex items-center justify-center rounded-full border border-[#D0C9D6] bg-white px-6 py-3.5 text-sm font-semibold text-[#6750A4] transition hover:bg-[#F8F5FF]"
          >
            Ver preço
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
        <div className="rounded-[36px] border border-[#E7E0EC] bg-white p-6 shadow-sm md:p-8">
          <div className="max-w-2xl">
            <div className="inline-flex rounded-full bg-[#E8DEF8] px-3 py-1 text-xs font-semibold text-[#6750A4]">
              FAQ
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.02em] text-[#1C1B1F] md:text-4xl">
              Perguntas frequentes antes de começar
            </h2>
            <p className="mt-3 text-base leading-7 text-[#625B71]">
              Respostas rápidas para ajudar você a entender como a plataforma funciona.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {faqs.map((f) => (
              <div
                key={f.q}
                className="rounded-[28px] border border-[#E7E0EC] bg-[#FCFCFF] p-6"
              >
                <div className="text-base font-bold text-[#1C1B1F]">{f.q}</div>
                <p className="mt-3 text-sm leading-6 text-[#625B71]">{f.a}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/sites/new"
              className="inline-flex items-center justify-center rounded-full bg-[#6750A4] px-6 py-3.5 text-sm font-bold text-white shadow-[0_10px_28px_rgba(103,80,164,0.28)] transition hover:bg-[#5D4797]"
            >
              Criar meu site agora
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full border border-[#D0C9D6] bg-white px-6 py-3.5 text-sm font-semibold text-[#6750A4] transition hover:bg-[#F8F5FF]"
            >
              Entrar no painel
            </Link>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-7xl px-4 pb-14 md:px-6 md:pb-20">
        <div className="rounded-[36px] bg-[#6750A4] p-8 text-white shadow-[0_20px_50px_rgba(103,80,164,0.28)] md:p-10">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-3xl font-black tracking-[-0.02em] md:text-4xl">
                Pronto para transformar sua criação de sites em um fluxo mais profissional?
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/85 md:text-base">
                Use uma plataforma com aparência moderna, processo simples e uma
                experiência que transmite valor desde o primeiro acesso.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href="/sites/new"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3.5 text-sm font-bold text-[#6750A4] transition hover:bg-[#F3EDF7]"
              >
                Criar meu site
              </Link>
              <a
                href={SUPPORT_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Entrar em contato
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E7E0EC] bg-white/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="text-sm text-[#625B71]">
            © {new Date().getFullYear()} PL - Painel. Todos os direitos reservados.
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-[#625B71]">
            <a href="#beneficios" className="transition hover:text-[#1C1B1F]">
              Benefícios
            </a>
            <a href="#como-funciona" className="transition hover:text-[#1C1B1F]">
              Como funciona
            </a>
            <a href="#preco" className="transition hover:text-[#1C1B1F]">
              Preço
            </a>
            <a href="#faq" className="transition hover:text-[#1C1B1F]">
              FAQ
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
