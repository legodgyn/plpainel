import Link from "next/link";
import { headers } from "next/headers";
import PublicGeneratedSite from "@/app/components/PublicGeneratedSite";

export const dynamic = "force-dynamic";

const ROOT_DOMAINS = [
  "plpainel.com",
  "acmpainel.com.br",
  "ehspainel.com.br",
  "lcppainel.com.br",
  "lcspainel.com.br",
  "mapspainel.com.br",
];

function getCleanHost(host: string) {
  return host.split(":")[0].toLowerCase();
}

function getBaseDomain(host: string) {
  return ROOT_DOMAINS.find((d) => host === d || host.endsWith(`.${d}`));
}

function getSlug(host: string, base: string | undefined) {
  if (!base) return null;
  if (host === base) return null;
  return host.replace(`.${base}`, "");
}

function isLocalHost(host: string) {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".localhost")
  );
}

export default async function HomePage() {
  const headerList = await headers();
  const host = headerList.get("host") || "";

  const cleanHost = getCleanHost(host);
  const base = getBaseDomain(cleanHost);
  const slug = getSlug(cleanHost, base);

  if (slug) {
    return <PublicGeneratedSite slug={slug} />;
  }

  if (!base && cleanHost && !isLocalHost(cleanHost)) {
    const customDomainSlug = cleanHost.startsWith("www.")
      ? cleanHost.slice(4)
      : cleanHost;

    return <PublicGeneratedSite slug={customDomainSlug} />;
  }

  return (
    <main className="pl-home">
      <style>{`
        .pl-home {
          --bg: #f3f8f5;
          --ink: #10231c;
          --muted: #60746b;
          --green: #00b884;
          --green-2: #057b5f;
          --line: #dce9e3;
          --soft: #eaf8f2;
          --shadow: 0 22px 70px rgba(16, 35, 28, 0.1);
          min-height: 100vh;
          color: var(--ink);
          background:
            radial-gradient(circle at 14% 16%, rgba(0, 184, 132, 0.15), transparent 24rem),
            radial-gradient(circle at 86% 10%, rgba(35, 214, 184, 0.16), transparent 25rem),
            var(--bg);
        }

        .pl-home * { box-sizing: border-box; }
        .pl-home a { color: inherit; text-decoration: none; }
        .pl-home-wrap { width: min(1120px, calc(100% - 32px)); margin: 0 auto; }

        .pl-home-header {
          position: sticky;
          top: 0;
          z-index: 30;
          border-bottom: 1px solid rgba(220, 233, 227, 0.85);
          background: rgba(243, 248, 245, 0.86);
          backdrop-filter: blur(18px);
        }

        .pl-home-nav {
          min-height: 78px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .pl-home-logo {
          display: block;
          width: 166px;
          height: 54px;
          background: url("/logo.png?v=20260514") left center / contain no-repeat;
        }

        .pl-home-links {
          display: flex;
          align-items: center;
          gap: 24px;
          color: var(--muted);
          font-size: 14px;
          font-weight: 850;
        }

        .pl-home-actions { display: flex; gap: 10px; }

        .pl-home-btn {
          min-height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--line);
          border-radius: 999px;
          background: white;
          padding: 0 18px;
          font-size: 14px;
          font-weight: 950;
          box-shadow: 0 12px 30px rgba(16, 35, 28, 0.05);
        }

        .pl-home-btn.primary {
          border-color: transparent;
          background: linear-gradient(135deg, var(--green), var(--green-2));
          color: white;
          box-shadow: 0 18px 42px rgba(0, 184, 132, 0.26);
        }

        .pl-home-hero {
          padding: 70px 0 44px;
          text-align: center;
        }

        .pl-home-badge {
          width: fit-content;
          display: inline-flex;
          align-items: center;
          gap: 9px;
          border: 1px solid #bfeedd;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.74);
          padding: 10px 14px;
          color: var(--green-2);
          font-size: 13px;
          font-weight: 950;
        }

        .pl-home-badge i {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: var(--green);
          box-shadow: 0 0 0 8px rgba(0, 184, 132, 0.12);
        }

        .pl-home h1 {
          max-width: 940px;
          margin: 22px auto 0;
          font-size: clamp(44px, 7vw, 86px);
          line-height: 0.95;
          letter-spacing: 0;
        }

        .pl-home-hero p {
          max-width: 720px;
          margin: 22px auto 0;
          color: var(--muted);
          font-size: 20px;
          font-weight: 700;
          line-height: 1.55;
        }

        .pl-home-hero-actions {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 30px;
        }

        .pl-home-proof {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 26px;
        }

        .pl-home-proof span {
          border: 1px solid var(--line);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.72);
          padding: 10px 14px;
          color: var(--muted);
          font-size: 13px;
          font-weight: 850;
        }

        .pl-home-video-section { padding: 38px 0 76px; }

        .pl-home-video-card {
          overflow: hidden;
          border: 1px solid var(--line);
          border-radius: 30px;
          background: white;
          box-shadow: var(--shadow);
        }

        .pl-home-video-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          border-bottom: 1px solid var(--line);
          padding: 18px 22px;
        }

        .pl-home-video-title strong { display: block; font-size: 18px; }

        .pl-home-video-title span {
          display: block;
          margin-top: 4px;
          color: var(--muted);
          font-size: 13px;
          font-weight: 750;
        }

        .pl-home-video-body {
          position: relative;
          display: grid;
          min-height: 500px;
          place-items: center;
          background:
            linear-gradient(135deg, rgba(3, 45, 35, 0.92), rgba(0, 184, 132, 0.72)),
            url("/logo-plpainel.png");
          background-repeat: no-repeat;
          background-position: center;
          background-size: min(900px, 90vw) auto;
        }

        .pl-home-video-frame {
          width: min(920px, calc(100% - 36px));
          aspect-ratio: 16 / 9;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.35);
          border-radius: 24px;
          background: #06110d;
          box-shadow: 0 24px 80px rgba(0,0,0,.24);
        }

        .pl-home-video-frame iframe {
          display: block;
          width: 100%;
          height: 100%;
          border: 0;
        }

        .pl-home-section { padding: 78px 0; }

        .pl-home-section-head {
          max-width: 760px;
          margin: 0 auto 34px;
          text-align: center;
        }

        .pl-home-kicker {
          color: var(--green-2);
          font-size: 12px;
          font-weight: 950;
          text-transform: uppercase;
        }

        .pl-home h2 {
          margin: 10px 0 0;
          font-size: clamp(34px, 5vw, 60px);
          line-height: 1.02;
          letter-spacing: 0;
        }

        .pl-home-section-head p {
          margin: 14px 0 0;
          color: var(--muted);
          font-size: 17px;
          font-weight: 700;
          line-height: 1.6;
        }

        .pl-home-steps {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        .pl-home-step,
        .pl-home-benefit,
        .pl-home-number,
        .pl-home-faq details {
          border: 1px solid var(--line);
          background: white;
          box-shadow: 0 16px 45px rgba(16,35,28,.06);
        }

        .pl-home-step {
          border-radius: 24px;
          padding: 24px;
        }

        .pl-home-step-number {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          background: var(--soft);
          color: var(--green-2);
          font-size: 13px;
          font-weight: 950;
        }

        .pl-home-step h3 {
          margin: 18px 0 0;
          font-size: 21px;
          line-height: 1.1;
        }

        .pl-home-step p,
        .pl-home-benefit span,
        .pl-home-faq details p {
          color: var(--muted);
          font-size: 14px;
          font-weight: 700;
          line-height: 1.55;
        }

        .pl-home-benefits {
          display: grid;
          grid-template-columns: .92fr 1.08fr;
          gap: 26px;
          align-items: stretch;
        }

        .pl-home-benefit-copy {
          border: 1px solid var(--line);
          border-radius: 30px;
          background: #05251d;
          padding: 34px;
          color: white;
        }

        .pl-home-benefit-copy p {
          color: rgba(255,255,255,.68);
          font-size: 17px;
          font-weight: 700;
          line-height: 1.65;
        }

        .pl-home-benefit-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .pl-home-benefit {
          border-radius: 24px;
          padding: 24px;
        }

        .pl-home-benefit b { display: block; font-size: 18px; }
        .pl-home-benefit span { display: block; margin-top: 10px; }

        .pl-home-numbers {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .pl-home-number {
          border-radius: 26px;
          padding: 30px;
          text-align: center;
          box-shadow: var(--shadow);
        }

        .pl-home-number strong {
          display: block;
          color: var(--green-2);
          font-size: clamp(42px, 6vw, 76px);
          line-height: .9;
        }

        .pl-home-number span {
          display: block;
          margin-top: 12px;
          color: var(--muted);
          font-weight: 850;
        }

        .pl-home-faq {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }

        .pl-home-faq details {
          border-radius: 22px;
          padding: 18px 20px;
          box-shadow: 0 14px 34px rgba(16,35,28,.05);
        }

        .pl-home-faq summary {
          cursor: pointer;
          font-weight: 950;
        }

        .pl-home-footer {
          border-top: 1px solid var(--line);
          padding: 28px 0;
          color: var(--muted);
          font-size: 14px;
          font-weight: 800;
        }

        @media (max-width: 920px) {
          .pl-home-links { display: none; }
          .pl-home-steps { grid-template-columns: repeat(2, 1fr); }
          .pl-home-benefits { grid-template-columns: 1fr; }
          .pl-home-video-body { min-height: 380px; }
        }

        @media (max-width: 640px) {
          .pl-home-logo { width: 132px; height: 44px; }
          .pl-home-actions .pl-home-btn:not(.primary) { display: none; }
          .pl-home-hero { padding-top: 48px; }
          .pl-home-steps,
          .pl-home-benefit-grid,
          .pl-home-numbers,
          .pl-home-faq { grid-template-columns: 1fr; }
          .pl-home-video-top { display: block; }
          .pl-home-video-top .pl-home-btn { margin-top: 14px; }
        }
      `}</style>

      <header className="pl-home-header">
        <div className="pl-home-wrap pl-home-nav">
          <Link className="pl-home-logo" href="/" aria-label="PLPainel" />
          <nav className="pl-home-links">
            <a href="#video">Vídeo aula</a>
            <a href="#passos">Como funciona</a>
            <a href="#beneficios">Benefícios</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="pl-home-actions">
            <Link className="pl-home-btn" href="/login">Entrar</Link>
            <Link className="pl-home-btn primary" href="/login">Criar conta</Link>
          </div>
        </div>
      </header>

      <section className="pl-home-hero">
        <div className="pl-home-wrap">
          <div className="pl-home-badge"><i /> Sites, domínio e validação em poucos minutos</div>
          <h1>Publique sites profissionais sem hospedagem, sem designer e sem complicação.</h1>
          <p>
            Com o PLPainel, você gera páginas por CNPJ, conecta domínio próprio,
            ativa SSL e recebe códigos na inbox interna do painel.
          </p>
          <div className="pl-home-hero-actions">
            <Link className="pl-home-btn primary" href="/login">Começar agora</Link>
            <a className="pl-home-btn" href="#video">Assistir vídeo aula</a>
          </div>
          <div className="pl-home-proof">
            <span>✓ 1 token por site publicado</span>
            <span>✓ Domínio próprio com SSL</span>
            <span>✓ Caixa interna para códigos</span>
          </div>
        </div>
      </section>

      <section id="video" className="pl-home-video-section">
        <div className="pl-home-wrap pl-home-video-card">
          <div className="pl-home-video-top">
            <div className="pl-home-video-title">
              <strong>Veja o fluxo completo antes de criar sua conta</strong>
              <span>Um vídeo curto explicando criação, domínio, SSL e inbox interna.</span>
            </div>
            <Link className="pl-home-btn primary" href="/login">Criar conta grátis</Link>
          </div>
          <div className="pl-home-video-body">
            <div className="pl-home-video-frame">
              <iframe
                src="https://www.youtube.com/embed/ISmcbsGXl_o"
                title="Vídeo aula PLPainel"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      <section id="passos" className="pl-home-section">
        <div className="pl-home-wrap">
          <div className="pl-home-section-head">
            <div className="pl-home-kicker">Como funciona</div>
            <h2>Quatro passos claros para sair do zero ao site online.</h2>
            <p>O cliente entende o caminho antes de entrar no painel, sem precisar ler documentação técnica.</p>
          </div>
          <div className="pl-home-steps">
            {[
              ["01", "Crie sua conta", "Acesse o painel e compre os tokens que quiser usar."],
              ["02", "Informe o CNPJ", "O sistema busca os dados e monta a estrutura inicial do site."],
              ["03", "Publique o site", "Use um domínio da plataforma ou conecte o domínio próprio."],
              ["04", "Valide e receba", "Use meta tag, SSL e inbox interna para receber mensagens e códigos."],
            ].map(([number, title, text]) => (
              <article className="pl-home-step" key={number}>
                <div className="pl-home-step-number">{number}</div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="beneficios" className="pl-home-section">
        <div className="pl-home-wrap pl-home-benefits">
          <div className="pl-home-benefit-copy">
            <div className="pl-home-kicker">Por que usar</div>
            <h2>Menos trabalho manual para publicar e validar sites.</h2>
            <p>
              Uma página de conversão direta: promessa forte, vídeo, passos, benefícios,
              números e FAQ com foco em explicar o valor antes do cadastro.
            </p>
            <Link className="pl-home-btn primary" href="/login">Começar agora</Link>
          </div>
          <div className="pl-home-benefit-grid">
            <div className="pl-home-benefit"><b>Sem hospedagem manual</b><span>O site fica online pela estrutura da plataforma.</span></div>
            <div className="pl-home-benefit"><b>Domínio próprio</b><span>Fluxo guiado para DNS, SSL e subdomínios do cliente.</span></div>
            <div className="pl-home-benefit"><b>Conteúdo por CNPJ</b><span>Preenchimento mais rápido para publicar com menos atrito.</span></div>
            <div className="pl-home-benefit"><b>Inbox interna</b><span>Recebimento de mensagens e códigos direto no painel.</span></div>
          </div>
        </div>
      </section>

      <section className="pl-home-section">
        <div className="pl-home-wrap pl-home-numbers">
          <div className="pl-home-number"><strong>R$5</strong><span>por site publicado</span></div>
          <div className="pl-home-number"><strong>SSL</strong><span>para domínio próprio</span></div>
          <div className="pl-home-number"><strong>MX</strong><span>inbox interna opcional</span></div>
        </div>
      </section>

      <section id="faq" className="pl-home-section">
        <div className="pl-home-wrap">
          <div className="pl-home-section-head">
            <div className="pl-home-kicker">Perguntas frequentes</div>
            <h2>Tire as dúvidas antes de entrar.</h2>
            <p>Respostas simples para reduzir insegurança e aumentar conversão.</p>
          </div>
          <div className="pl-home-faq">
            <details open>
              <summary>Preciso ter domínio próprio?</summary>
              <p>Não. Você pode usar os domínios da plataforma ou conectar um domínio seu depois.</p>
            </details>
            <details>
              <summary>Quanto custa criar um site?</summary>
              <p>Cada site publicado consome 1 token. O preço base exibido é R$5 por token.</p>
            </details>
            <details>
              <summary>O SSL é automático?</summary>
              <p>Sim, depois que o DNS aponta corretamente para o servidor.</p>
            </details>
            <details>
              <summary>Como recebo códigos por e-mail?</summary>
              <p>O domínio pode usar a inbox interna do painel com apontamento MX configurado.</p>
            </details>
          </div>
        </div>
      </section>

      <footer className="pl-home-footer">
        <div className="pl-home-wrap">© 2026 PLPainel. Todos os direitos reservados.</div>
      </footer>
    </main>
  );
}
