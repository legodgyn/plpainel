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
      title: "Criação em minutos",
      desc: "Gere a estrutura do site com rapidez e reduza o tempo entre ideia e publicação.",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 3l7 4v10l-7 4-7-4V7l7-4Z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      ),
    },
    {
      title: "Dados automáticos por CNPJ",
      desc: "Acelere o preenchimento inicial com informações da empresa e comece já com uma base pronta.",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="4" y="5" width="16" height="14" rx="3" />
          <path d="M8 9h8M8 13h5" />
        </svg>
      ),
    },
    {
      title: "Sem mensalidade",
      desc: "Você compra tokens e usa conforme a necessidade, sem assinatura recorrente.",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="6" width="18" height="12" rx="3" />
          <path d="M8 12h8" />
        </svg>
      ),
    },
    {
      title: "Visual profissional",
      desc: "Páginas com aparência moderna, mais confiáveis e mais agradáveis para o usuário final.",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
      ),
    },
    {
      title: "Publicação rápida",
      desc: "Depois de ajustar os detalhes, seu site pode ir ao ar em poucos passos.",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 3v18M3 12h18" />
          <circle cx="12" cy="12" r="8" />
        </svg>
      ),
    },
    {
      title: "Escala no painel",
      desc: "Crie vários sites com um fluxo mais organizado e centralizado em um só lugar.",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M5 18V9M12 18V6M19 18v-4" />
          <path d="M3 18h18" />
        </svg>
      ),
    },
  ];

  const steps = [
    {
      n: "01",
      title: "Digite o CNPJ",
      desc: "A plataforma prepara automaticamente a base do site com mais rapidez.",
    },
    {
      n: "02",
      title: "Ajuste o conteúdo",
      desc: "Personalize textos, contatos e informações para deixar a página pronta para uso.",
    },
    {
      n: "03",
      title: "Publique e compartilhe",
      desc: "Finalize o processo e coloque o site no ar em um fluxo direto e intuitivo.",
    },
  ];

  const faqs = [
    {
      q: "Quanto custa criar um site?",
      a: "Cada site utiliza 1 token. Hoje, 1 token custa R$ 4,00.",
    },
    {
      q: "Preciso pagar mensalidade?",
      a: "Não. O modelo é por uso. Você compra tokens e utiliza conforme sua necessidade.",
    },
    {
      q: "Posso editar o site depois?",
      a: "Sim. Você pode atualizar conteúdo, contatos e outras informações quando quiser.",
    },
    {
      q: "Preciso contratar hospedagem?",
      a: "Não. A estrutura da plataforma já cobre o necessário para a publicação do site.",
    },
  ];

  const softCard =
    "rounded-[28px] border border-[#E7E0EC] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05),0_10px_30px_rgba(103,80,164,0.08)]";
  const primaryButton =
    "inline-flex items-center justify-center rounded-full bg-[#6750A4] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(103,80,164,0.28)] transition hover:bg-[#5D4797]";
  const tonalButton =
    "inline-flex items-center justify-center rounded-full bg-[#E8DEF8] px-6 py-3.5 text-sm font-semibold text-[#4F378B] transition hover:bg-[#DED0F4]";
  const outlinedButton =
    "inline-flex items-center justify-center rounded-full border border-[#CAC4D0] bg-white px-6 py-3.5 text-sm font-semibold text-[#4F378B] transition hover:bg-[#F7F2FA]";

  return (
    <main className="min-h-screen bg-[#FFFBFE] text-[#1C1B1F]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-140px] top-[-100px] h-[340px] w-[340px] rounded-full bg-[#E8DEF8] blur-3xl" />
        <div className="absolute right-[-120px] top-[80px] h-[320px] w-[320px] rounded-full bg-[#DDE3FF] blur-3xl" />
        <div className="absolute bottom-[-140px] left-1/2 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-[#FBE4EC] blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#E7E0EC] bg-[#FFFBFE]/88 backdrop-blur-xl">
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
              <div className="text-xs text-[#625B71]">Crie sites com velocidade e aparência profissional</div>
            </div>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            <a href="#beneficios" className="text-sm font-medium text-[#625B71] transition hover:text-[#1C1B1F]">
              Benefícios
            </a>
            <a href="#como-funciona" className="text-sm font-medium text-[#625B71] transition hover:text-[#1C1B1F]">
              Como funciona
            </a>
            <a href="#preco" className="text-sm font-medium text-[#625B71] transition hover:text-[#1C1B1F]">
              Preço
            </a>
            <a href="#faq" className="text-sm font-medium text-[#625B71] transition hover:text-[#1C1B1F]">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={SUPPORT_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden rounded-full border border-[#CAC4D0] bg-white px-4 py-2 text-sm font-semibold text-[#4F378B] transition hover:bg-[#F7F2FA] md:inline-flex"
            >
              WhatsApp
            </a>

            <Link
              href="/login"
              className="hidden rounded-full bg-[#E8DEF8] px-4 py-2 text-sm font-semibold text-[#4F378B] transition hover:bg-[#DED0F4] md:inline-flex"
            >
              Entrar
            </Link>

            <Link href="/sites/new" className="inline-flex rounded-full bg-[#6750A4] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(103,80,164,0.25)] transition hover:bg-[#5D4797]">
              Criar meu site
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-4 pb-14 pt-12 md:px-6 md:pb-20 md:pt-16">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
            <div>

              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight tracking-[-0.04em] md:text-5xl lg:text-6xl">
                Gere sites profissionais em minutos para verificação de BM's.
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-[#625B71] md:text-lg">
                Crie páginas a partir do CNPJ, personalize o conteúdo com rapidez
                e publique e veja sua BM ser verificada rapidamente.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/sites/new" className={primaryButton}>
                  Criar meu site agora
                </Link>
                <a href="#como-funciona" className={outlinedButton}>
                  Ver como funciona
                </a>
              </div>

              <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
                <div className={`${softCard} p-4`}>
                  <div className="text-sm font-semibold text-[#1C1B1F]">Mais conversão visual</div>
                  <div className="mt-1 text-sm text-[#625B71]">Cara de software real e confiável</div>
                </div>
                <div className={`${softCard} p-4`}>
                  <div className="text-sm font-semibold text-[#1C1B1F]">Menos esforço</div>
                  <div className="mt-1 text-sm text-[#625B71]">Fluxo simples do início à publicação</div>
                </div>
                <div className={`${softCard} p-4`}>
                  <div className="text-sm font-semibold text-[#1C1B1F]">Escala com controle</div>
                  <div className="mt-1 text-sm text-[#625B71]">Crie vários sites no mesmo painel</div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-[#625B71]">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#4CAF50]" />
                  Publicação rápida
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#6750A4]" />
                  Sem mensalidade
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#4F8CFF]" />
                  Visual moderno
                </div>
              </div>
            </div>

            {/* Mock SaaS / conversão */}
            <div className="relative">
              <div className="rounded-[36px] border border-[#E7E0EC] bg-[#F7F2FA] p-3 shadow-[0_2px_10px_rgba(0,0,0,0.05),0_30px_60px_rgba(103,80,164,0.14)]">
                <div className="rounded-[32px] border border-[#E7E0EC] bg-white p-4 md:p-5">
                  <div className="flex items-center justify-between rounded-[24px] bg-[#FCFCFF] px-4 py-3 ring-1 ring-[#E7E0EC]">
                    <div>
                      <div className="text-sm font-semibold text-[#1C1B1F]">Painel de criação</div>
                      <div className="mt-1 text-xs text-[#625B71]">Fluxo rápido para gerar e publicar</div>
                    </div>
                    <div className="rounded-full bg-[#EEF7F1] px-3 py-1 text-xs font-semibold text-[#3D5E49]">
                      online
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className={`${softCard} p-5`}>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#625B71]">
                            Novo site
                          </div>
                          <div className="mt-2 text-xl font-black text-[#1C1B1F]">
                            Empresa criada com sucesso
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[#625B71]">
                            A plataforma já preparou a estrutura da página com base no
                            CNPJ e deixou o seu fluxo mais rápido.
                          </p>
                        </div>

                        <div className="rounded-2xl bg-[#E8DEF8] px-3 py-2 text-xs font-semibold text-[#4F378B]">
                          1 token usado
                        </div>
                      </div>

                      <div className="mt-6 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[22px] bg-[#F8F5FF] p-4">
                          <div className="text-xs font-medium text-[#625B71]">Origem</div>
                          <div className="mt-2 text-base font-bold text-[#1C1B1F]">CNPJ</div>
                          <div className="mt-1 text-sm text-[#625B71]">Base inicial pronta</div>
                        </div>

                        <div className="rounded-[22px] bg-[#EEF2FF] p-4">
                          <div className="text-xs font-medium text-[#625B71]">Template</div>
                          <div className="mt-2 text-base font-bold text-[#1C1B1F]">Simples</div>
                          <div className="mt-1 text-sm text-[#625B71]">Visual moderno</div>
                        </div>

                        <div className="rounded-[22px] bg-[#EEF7F1] p-4">
                          <div className="text-xs font-medium text-[#625B71]">Status</div>
                          <div className="mt-2 text-base font-bold text-[#1C1B1F]">Publicado</div>
                          <div className="mt-1 text-sm text-[#625B71]">Pronto para uso</div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-[24px] border border-[#E7E0EC] bg-[#FFFBFE] p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="text-sm font-semibold text-[#1C1B1F]">Prévia do site</div>
                            <div className="mt-1 text-sm text-[#625B71]">seu-site.plpainel.com</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-[#E8DEF8] px-3 py-1 text-xs font-semibold text-[#4F378B]">
                              responsivo
                            </span>
                            <span className="rounded-full bg-[#FFF4E5] px-3 py-1 text-xs font-semibold text-[#8A5A00]">
                              pronto para personalizar
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 rounded-[24px] border border-[#E7E0EC] bg-white p-5">
                          <div className="h-5 w-28 rounded-full bg-[#E8DEF8]" />
                          <div className="mt-4 h-10 w-4/5 rounded-2xl bg-[#F3EDF7]" />
                          <div className="mt-3 h-3 w-full rounded-full bg-[#EEE7F2]" />
                          <div className="mt-2 h-3 w-5/6 rounded-full bg-[#EEE7F2]" />
                          <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl bg-[#F8F5FF] p-4">
                              <div className="h-3 w-20 rounded-full bg-[#D0BCFF]" />
                              <div className="mt-3 h-8 rounded-xl bg-[#E8DEF8]" />
                            </div>
                            <div className="rounded-2xl bg-[#EEF2FF] p-4">
                              <div className="h-3 w-20 rounded-full bg-[#B3C5FF]" />
                              <div className="mt-3 h-8 rounded-xl bg-[#DDE3FF]" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className={`${softCard} p-5`}>
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#625B71]">
                          Tempo de criação
                        </div>
                        <div className="mt-2 text-3xl font-black text-[#1C1B1F]">Minutos</div>
                        <div className="mt-1 text-sm text-[#625B71]">Da geração até a publicação</div>
                      </div>

                      <div className={`${softCard} p-5`}>
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#625B71]">
                          Tokens disponíveis
                        </div>
                        <div className="mt-2 text-3xl font-black text-[#1C1B1F]">24</div>
                        <div className="mt-1 text-sm text-[#625B71]">Use conforme sua demanda</div>
                      </div>

                      <div className={`${softCard} p-5`}>
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#625B71]">
                          Resultado
                        </div>
                        <div className="mt-2 text-lg font-bold text-[#1C1B1F]">
                          Mais valor percebido
                        </div>
                        <div className="mt-1 text-sm text-[#625B71]">
                          Uma home mais bonita, clara e convidativa para vender melhor.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -left-5 top-10 hidden rounded-[24px] border border-[#E7E0EC] bg-white px-4 py-3 shadow-[0_8px_24px_rgba(103,80,164,0.10)] md:block">
                <div className="text-xs text-[#625B71]">Publicação</div>
                <div className="mt-1 text-sm font-semibold text-[#1C1B1F]">site pronto para uso</div>
              </div>

              <div className="absolute -bottom-5 right-5 hidden rounded-[24px] border border-[#E7E0EC] bg-white px-4 py-3 shadow-[0_8px_24px_rgba(103,80,164,0.10)] md:block">
                <div className="text-xs text-[#625B71]">Subdomínio</div>
                <div className="mt-1 text-sm font-semibold text-[#1C1B1F]">seu-site.plpainel.com</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos / prova visual leve */}
      <section className="mx-auto max-w-7xl px-4 py-4 md:px-6">
        <div className="rounded-[28px] border border-[#E7E0EC] bg-white px-6 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="text-center text-sm text-[#625B71]">
            Pensado para quem quer criar páginas com mais rapidez, mais clareza e mais valor percebido
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section id="beneficios" className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
        <div className="max-w-2xl">
          <div className="inline-flex rounded-full bg-[#E8DEF8] px-3 py-1 text-xs font-semibold text-[#4F378B]">
            Benefícios
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] md:text-4xl">
            Tudo o que você precisa para criar páginas com mais velocidade e mais apelo visual
          </h2>
          <p className="mt-3 text-base leading-7 text-[#625B71]">
            Uma home mais clara, mais moderna e mais orientada à conversão faz o produto parecer
            mais forte logo no primeiro contato.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {benefits.map((b) => (
            <div
              key={b.title}
              className={`${softCard} p-6 transition hover:-translate-y-0.5 hover:shadow-[0_2px_10px_rgba(0,0,0,0.08),0_16px_30px_rgba(103,80,164,0.12)]`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3EDF7] text-[#6750A4]">
                {b.icon}
              </div>
              <h3 className="mt-5 text-lg font-bold text-[#1C1B1F]">{b.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#625B71]">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className={`${softCard} p-6 md:p-8`}>
            <div className="inline-flex rounded-full bg-[#E8DEF8] px-3 py-1 text-xs font-semibold text-[#4F378B]">
              Como funciona
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] md:text-4xl">
              Três passos para sair do zero e publicar rápido
            </h2>
            <p className="mt-3 text-base leading-7 text-[#625B71]">
              Um processo mais simples reduz atrito e deixa sua plataforma mais fácil de entender.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/sites/new" className={primaryButton}>
                Começar agora
              </Link>
              <a href="#preco" className={tonalButton}>
                Ver preço
              </a>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className={`${softCard} p-6`}>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8DEF8] text-sm font-black text-[#4F378B]">
                  {s.n}
                </div>
                <h3 className="mt-5 text-lg font-bold text-[#1C1B1F]">{s.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#625B71]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Preço */}
      <section id="preco" className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className={`${softCard} p-6 md:p-8`}>
            <div className="inline-flex rounded-full bg-[#E8DEF8] px-3 py-1 text-xs font-semibold text-[#4F378B]">
              Preço simples
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] md:text-4xl">
              Modelo direto para você verificar sua BM rapidamente.
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[#625B71]">
              Sem assinatura fixa. Você compra tokens e cria conforme sua necessidade, com
              mais controle de custo e mais flexibilidade para escalar.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[28px] bg-[#F8F5FF] p-6">
                <div className="text-sm font-semibold text-[#625B71]">Regra atual</div>
                <div className="mt-2 text-4xl font-black tracking-[-0.04em] text-[#1C1B1F]">
                  1 Token = R$ 4,00
                </div>
                <div className="mt-3 text-sm text-[#625B71]">
                  Cada token equivale à criação de 1 site.
                </div>
              </div>

              <div className="rounded-[28px] bg-[#EEF2FF] p-6">
                <div className="text-sm font-semibold text-[#625B71]">Ideal para</div>
                <div className="mt-2 text-xl font-bold text-[#1C1B1F]">
                  Escalar sem mensalidade
                </div>
                <div className="mt-3 text-sm text-[#625B71]">
                  Gere quantos sites quiser, no ritmo do seu fluxo.
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] bg-[#6750A4] p-6 text-white shadow-[0_20px_50px_rgba(103,80,164,0.28)] md:p-8">
            <div className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white w-fit">
              Comece agora
            </div>
            <h3 className="mt-4 text-3xl font-black tracking-[-0.03em]">
              Cansado de tentar aprovar sua BM?
            </h3>
            <p className="mt-3 text-sm leading-7 text-white/85">
              Uma landing mais clara e mais chamativa que ajuda a meta a entender
              sua empresa e verificar rapidamente.
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/sites/new"
                className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3.5 text-sm font-semibold text-[#6750A4] transition hover:bg-[#F3EDF7]"
              >
                Criar meu site
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Entrar no painel
              </Link>
            </div>

            <div className="mt-6 rounded-[24px] bg-white/10 p-4 text-sm text-white/85">
              Sem complexidade. Mais velocidade para criar e publicar.
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
        <div className={`${softCard} p-6 md:p-8`}>
          <div className="max-w-2xl">
            <div className="inline-flex rounded-full bg-[#E8DEF8] px-3 py-1 text-xs font-semibold text-[#4F378B]">
              FAQ
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] md:text-4xl">
              Perguntas frequentes
            </h2>
            <p className="mt-3 text-base leading-7 text-[#625B71]">
              As principais respostas apresentadas de forma mais clara e profissional.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {faqs.map((f) => (
              <div key={f.q} className="rounded-[24px] border border-[#E7E0EC] bg-[#FCFCFF] p-6">
                <div className="text-base font-bold text-[#1C1B1F]">{f.q}</div>
                <p className="mt-3 text-sm leading-6 text-[#625B71]">{f.a}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/sites/new" className={primaryButton}>
              Criar meu site agora
            </Link>
            <Link href="/login" className={outlinedButton}>
              Entrar no painel
            </Link>
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
