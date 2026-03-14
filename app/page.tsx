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
      title: "Criação guiada",
      desc: "Gere a estrutura do site com rapidez e tenha uma base pronta para personalizar.",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 3l7 4v10l-7 4-7-4V7l7-4Z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      ),
    },
    {
      title: "Dados automáticos",
      desc: "Aproveite o preenchimento inicial com base no CNPJ para ganhar tempo no processo.",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="4" y="5" width="16" height="14" rx="3" />
          <path d="M8 9h8M8 13h5" />
        </svg>
      ),
    },
    {
      title: "Publicação rápida",
      desc: "Saia do rascunho para um site publicado em poucos passos dentro do painel.",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 3v18M3 12h18" />
          <circle cx="12" cy="12" r="8" />
        </svg>
      ),
    },
    {
      title: "Fluxo com tokens",
      desc: "Sem mensalidade obrigatória. Você compra e utiliza conforme sua demanda.",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="6" width="18" height="12" rx="3" />
          <path d="M8 12h8" />
        </svg>
      ),
    },
    {
      title: "Layout responsivo",
      desc: "Visual moderno e adaptado para diferentes telas desde o primeiro acesso.",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="5" y="4" width="14" height="16" rx="2.5" />
          <path d="M10 17h4" />
        </svg>
      ),
    },
    {
      title: "Escala organizada",
      desc: "Crie e gerencie vários sites em um ambiente visualmente mais profissional.",
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
      desc: "Comece com os dados da empresa para acelerar a criação da estrutura inicial.",
    },
    {
      n: "02",
      title: "Revise e personalize",
      desc: "Ajuste conteúdo, contatos e detalhes visuais para deixar tudo alinhado com sua entrega.",
    },
    {
      n: "03",
      title: "Publique no painel",
      desc: "Finalize e deixe o site disponível em poucos minutos, com um processo direto.",
    },
  ];

  const faqs = [
    {
      q: "Quanto custa criar um site?",
      a: "Cada site utiliza 1 token. Atualmente, 1 token custa R$ 4,00.",
    },
    {
      q: "O site fica online rapidamente?",
      a: "Sim. Após concluir o processo, o site pode ser publicado no subdomínio gerado pela plataforma.",
    },
    {
      q: "Preciso contratar hospedagem?",
      a: "Não. A estrutura da plataforma já cobre o necessário para colocar o site no ar.",
    },
    {
      q: "Posso editar depois?",
      a: "Sim. Você pode atualizar textos, contatos e outros dados sempre que precisar.",
    },
  ];

  const materialCard =
    "rounded-[28px] border border-[#E7E0EC] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_rgba(103,80,164,0.08)]";
  const materialButtonPrimary =
    "inline-flex items-center justify-center rounded-full bg-[#6750A4] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(103,80,164,0.28)] transition hover:bg-[#5D4797]";
  const materialButtonTonal =
    "inline-flex items-center justify-center rounded-full bg-[#E8DEF8] px-6 py-3.5 text-sm font-semibold text-[#4F378B] transition hover:bg-[#DED0F4]";
  const materialButtonOutlined =
    "inline-flex items-center justify-center rounded-full border border-[#CAC4D0] bg-white px-6 py-3.5 text-sm font-semibold text-[#4F378B] transition hover:bg-[#F7F2FA]";

  return (
    <main className="min-h-screen bg-[#FFFBFE] text-[#1C1B1F]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-120px] top-[-80px] h-[320px] w-[320px] rounded-full bg-[#E8DEF8] blur-3xl" />
        <div className="absolute right-[-100px] top-[80px] h-[300px] w-[300px] rounded-full bg-[#DDE3FF] blur-3xl" />
        <div className="absolute bottom-[-120px] left-1/2 h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-[#F7E1EC] blur-3xl" />
      </div>

      <header className="sticky top-0 z-50 border-b border-[#E7E0EC] bg-[#FFFBFE]/85 backdrop-blur-xl">
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
              <div className="text-xs text-[#625B71]">Sites rápidos com experiência moderna</div>
            </div>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            <a href="#como-funciona" className="text-sm font-medium text-[#625B71] transition hover:text-[#1C1B1F]">
              Como funciona
            </a>
            <a href="#beneficios" className="text-sm font-medium text-[#625B71] transition hover:text-[#1C1B1F]">
              Benefícios
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

            <Link href="/sites/new" className="inline-flex rounded-full bg-[#6750A4] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(103,80,164,0.28)] transition hover:bg-[#5D4797]">
              Criar meu site
            </Link>
          </div>
        </div>
      </header>

      <section className="relative">
        <div className="mx-auto max-w-7xl px-4 pb-14 pt-12 md:px-6 md:pb-20 md:pt-16">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
            <div>
              <div className="inline-flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#E8DEF8] px-3 py-1 text-xs font-semibold text-[#4F378B]">
                  Design inspirado em Material 3
                </span>
                <span className="rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-semibold text-[#355CA8]">
                  SaaS claro, moderno e convidativo
                </span>
              </div>

              <h1 className="mt-5 max-w-2xl text-4xl font-black leading-tight tracking-[-0.04em] md:text-5xl lg:text-6xl">
                Crie sites com aparência profissional em uma plataforma que
                transmite valor desde o primeiro clique.
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-[#625B71] md:text-lg">
                Gere páginas a partir do CNPJ, personalize em poucos minutos e
                publique em um fluxo simples, bonito e com cara de produto SaaS
                moderno.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/sites/new" className={materialButtonPrimary}>
                  Criar meu site agora
                </Link>
                <a href="#preco" className={materialButtonOutlined}>
                  Ver preço do token
                </a>
              </div>

              <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
                <div className={`${materialCard} p-4`}>
                  <div className="text-sm font-semibold text-[#1C1B1F]">Fluxo intuitivo</div>
                  <div className="mt-1 text-sm text-[#625B71]">Menos atrito para criar e publicar</div>
                </div>
                <div className={`${materialCard} p-4`}>
                  <div className="text-sm font-semibold text-[#1C1B1F]">Visual confiável</div>
                  <div className="mt-1 text-sm text-[#625B71]">Experiência leve e mais premium</div>
                </div>
                <div className={`${materialCard} p-4`}>
                  <div className="text-sm font-semibold text-[#1C1B1F]">Sem mensalidade</div>
                  <div className="mt-1 text-sm text-[#625B71]">Use tokens conforme precisar</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[36px] border border-[#E7E0EC] bg-[#F7F2FA] p-3 shadow-[0_2px_8px_rgba(0,0,0,0.06),0_30px_60px_rgba(103,80,164,0.14)]">
                <div className="rounded-[32px] border border-[#E7E0EC] bg-white p-4 md:p-5">
                  <div className="flex items-center justify-between rounded-[24px] bg-[#F8F5FF] px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold text-[#1C1B1F]">Workspace</div>
                      <div className="mt-1 text-xs text-[#625B71]">Seu painel de criação</div>
                    </div>
                    <div className="rounded-full bg-[#E8DEF8] px-3 py-1 text-xs font-semibold text-[#4F378B]">
                      ativo
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[84px_1fr]">
                    <aside className="rounded-[24px] bg-[#F8F5FF] p-3">
                      <div className="space-y-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#6750A4] text-white shadow-[0_8px_16px_rgba(103,80,164,0.22)]">
                          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M4 6h16M4 12h16M4 18h10" />
                          </svg>
                        </div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#6750A4] shadow-sm ring-1 ring-[#E7E0EC]">
                          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <rect x="4" y="5" width="16" height="14" rx="3" />
                          </svg>
                        </div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#6750A4] shadow-sm ring-1 ring-[#E7E0EC]">
                          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M5 18V9M12 18V6M19 18v-4" />
                            <path d="M3 18h18" />
                          </svg>
                        </div>
                      </div>
                    </aside>

                    <div className="space-y-4">
                      <div className={`${materialCard} overflow-hidden`}>
                        <div className="border-b border-[#E7E0EC] bg-[#FCFCFF] px-5 py-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#625B71]">
                                Novo projeto
                              </div>
                              <div className="mt-1 text-lg font-bold text-[#1C1B1F]">
                                Empresa criada com sucesso
                              </div>
                            </div>
                            <div className="rounded-full bg-[#EEF7F1] px-3 py-1 text-xs font-semibold text-[#3D5E49]">
                              publicado
                            </div>
                          </div>
                        </div>

                        <div className="p-5">
                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="rounded-[22px] bg-[#F8F5FF] p-4">
                              <div className="text-xs font-medium text-[#625B71]">Origem</div>
                              <div className="mt-2 text-base font-bold text-[#1C1B1F]">CNPJ</div>
                              <div className="mt-1 text-sm text-[#625B71]">Base preenchida</div>
                            </div>
                            <div className="rounded-[22px] bg-[#EEF2FF] p-4">
                              <div className="text-xs font-medium text-[#625B71]">Template</div>
                              <div className="mt-2 text-base font-bold text-[#1C1B1F]">SaaS Light</div>
                              <div className="mt-1 text-sm text-[#625B71]">Visual profissional</div>
                            </div>
                            <div className="rounded-[22px] bg-[#FFF4E5] p-4">
                              <div className="text-xs font-medium text-[#625B71]">Token</div>
                              <div className="mt-2 text-base font-bold text-[#1C1B1F]">1 utilizado</div>
                              <div className="mt-1 text-sm text-[#625B71]">Sem recorrência</div>
                            </div>
                          </div>

                          <div className="mt-5 rounded-[24px] border border-[#E7E0EC] bg-[#FFFBFE] p-4">
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                              <div>
                                <div className="text-sm font-semibold text-[#1C1B1F]">
                                  Prévia do site
                                </div>
                                <div className="mt-1 text-sm text-[#625B71]">
                                  seu-site.plpainel.com
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-[#E8DEF8] px-3 py-1 text-xs font-semibold text-[#4F378B]">
                                  responsivo
                                </span>
                                <span className="rounded-full bg-[#EEF7F1] px-3 py-1 text-xs font-semibold text-[#3D5E49]">
                                  online
                                </span>
                              </div>
                            </div>

                            <div className="mt-4 rounded-[24px] border border-[#E7E0EC] bg-white p-5">
                              <div className="h-5 w-32 rounded-full bg-[#E8DEF8]" />
                              <div className="mt-4 h-10 w-3/4 rounded-2xl bg-[#F3EDF7]" />
                              <div className="mt-3 h-3 w-full rounded-full bg-[#EEE7F2]" />
                              <div className="mt-2 h-3 w-5/6 rounded-full bg-[#EEE7F2]" />
                              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                <div className="rounded-2xl bg-[#F8F5FF] p-4">
                                  <div className="h-3 w-16 rounded-full bg-[#D0BCFF]" />
                                  <div className="mt-3 h-8 rounded-xl bg-[#E8DEF8]" />
                                </div>
                                <div className="rounded-2xl bg-[#EEF2FF] p-4">
                                  <div className="h-3 w-16 rounded-full bg-[#B3C5FF]" />
                                  <div className="mt-3 h-8 rounded-xl bg-[#DDE3FF]" />
                                </div>
                                <div className="rounded-2xl bg-[#EEF7F1] p-4">
                                  <div className="h-3 w-16 rounded-full bg-[#B9E5C7]" />
                                  <div className="mt-3 h-8 rounded-xl bg-[#D8F3DF]" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className={`${materialCard} p-5`}>
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#625B71]">
                            Tokens
                          </div>
                          <div className="mt-2 text-3xl font-black text-[#1C1B1F]">24</div>
                          <div className="mt-1 text-sm text-[#625B71]">Disponíveis no painel</div>
                        </div>

                        <div className={`${materialCard} p-5`}>
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#625B71]">
                            Tempo de criação
                          </div>
                          <div className="mt-2 text-3xl font-black text-[#1C1B1F]">Minutos</div>
                          <div className="mt-1 text-sm text-[#625B71]">Fluxo rápido e direto</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -left-5 top-12 hidden rounded-[24px] border border-[#E7E0EC] bg-white px-4 py-3 shadow-[0_8px_24px_rgba(103,80,164,0.12)] md:block">
                <div className="text-xs text-[#625B71]">Novo site</div>
                <div className="mt-1 text-sm font-semibold text-[#1C1B1F]">gerado com sucesso</div>
              </div>

              <div className="absolute -bottom-5 right-5 hidden rounded-[24px] border border-[#E7E0EC] bg-white px-4 py-3 shadow-[0_8px_24px_rgba(103,80,164,0.12)] md:block">
                <div className="text-xs text-[#625B71]">Subdomínio</div>
                <div className="mt-1 text-sm font-semibold text-[#1C1B1F]">seu-site.plpainel.com</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="beneficios" className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
        <div className="max-w-2xl">
          <div className="inline-flex rounded-full bg-[#E8DEF8] px-3 py-1 text-xs font-semibold text-[#4F378B]">
            Benefícios
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] md:text-4xl">
            Uma experiência mais agradável para vender, criar e publicar
          </h2>
          <p className="mt-3 text-base leading-7 text-[#625B71]">
            Esta versão traz uma linguagem visual mais clara, confiável e alinhada
            à percepção de um produto SaaS moderno.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {benefits.map((b) => (
            <div key={b.title} className={`${materialCard} p-6 transition hover:-translate-y-0.5 hover:shadow-[0_2px_10px_rgba(0,0,0,0.08),0_16px_30px_rgba(103,80,164,0.12)]`}>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3EDF7] text-[#6750A4]">
                {b.icon}
              </div>
              <h3 className="mt-5 text-lg font-bold text-[#1C1B1F]">{b.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#625B71]">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="preco" className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className={`${materialCard} p-6 md:p-8`}>
            <div className="inline-flex rounded-full bg-[#E8DEF8] px-3 py-1 text-xs font-semibold text-[#4F378B]">
              Preço direto
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] md:text-4xl">
              Pague apenas pelo que usar
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[#625B71]">
              Um modelo simples para quem quer velocidade, previsibilidade e liberdade
              para criar conforme a demanda.
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
                <div className="text-sm font-semibold text-[#625B71]">Modelo</div>
                <div className="mt-2 text-xl font-bold text-[#1C1B1F]">
                  Sem mensalidade fixa
                </div>
                <div className="mt-3 text-sm text-[#625B71]">
                  Mais flexibilidade para escalar no seu ritmo.
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] bg-[#6750A4] p-6 text-white shadow-[0_20px_50px_rgba(103,80,164,0.28)] md:p-8">
            <div className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white w-fit">
              Comece agora
            </div>
            <h3 className="mt-4 text-3xl font-black tracking-[-0.03em]">
              Plataforma pronta para uso
            </h3>
            <p className="mt-3 text-sm leading-7 text-white/85">
              Crie seu primeiro site agora mesmo e experimente uma página inicial
              com visual mais comercial, mais convidativo e com cara de software moderno.
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
              Sem burocracia. Um fluxo simples para vender melhor sua solução.
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
        <div className="max-w-2xl">
          <div className="inline-flex rounded-full bg-[#E8DEF8] px-3 py-1 text-xs font-semibold text-[#4F378B]">
            Como funciona
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] md:text-4xl">
            Um processo simples, visual e rápido de entender
          </h2>
          <p className="mt-3 text-base leading-7 text-[#625B71]">
            Estruture a jornada do usuário com mais clareza e menos fricção.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className={`${materialCard} p-6`}>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8DEF8] text-sm font-black text-[#4F378B]">
                {s.n}
              </div>
              <h3 className="mt-5 text-lg font-bold text-[#1C1B1F]">{s.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#625B71]">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/sites/new" className={materialButtonPrimary}>
            Começar agora
          </Link>
          <a href="#preco" className={materialButtonTonal}>
            Ver preço
          </a>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
        <div className={`${materialCard} p-6 md:p-8`}>
          <div className="max-w-2xl">
            <div className="inline-flex rounded-full bg-[#E8DEF8] px-3 py-1 text-xs font-semibold text-[#4F378B]">
              FAQ
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] md:text-4xl">
              Perguntas frequentes
            </h2>
            <p className="mt-3 text-base leading-7 text-[#625B71]">
              Informações importantes apresentadas de forma mais limpa e confiável.
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
            <Link href="/sites/new" className={materialButtonPrimary}>
              Criar meu site agora
            </Link>
            <Link href="/login" className={materialButtonOutlined}>
              Entrar no painel
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14 md:px-6 md:pb-20">
        <div className="rounded-[36px] border border-[#E7E0EC] bg-[#F7F2FA] p-8 md:p-10">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-3xl font-black tracking-[-0.03em] text-[#1C1B1F] md:text-4xl">
                Uma landing page mais clara, moderna e com percepção real de SaaS
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#625B71] md:text-base">
                Esta versão aproxima sua home da linguagem visual do Material 3,
                com superfícies suaves, botões mais amigáveis, cards elevados e uma
                experiência muito mais comercial.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link href="/sites/new" className={materialButtonPrimary}>
                Criar meu site
              </Link>
              <a
                href={SUPPORT_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className={materialButtonOutlined}
              >
                Entrar em contato
              </a>
            </div>
          </div>
        </div>
      </section>

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
