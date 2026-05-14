"use client";

const videos = [
  {
    title: "Configuracao inicial",
    description: "Veja o passo a passo principal da plataforma antes de criar seus sites.",
    src: "https://www.youtube.com/embed/Pb5Tor1dEf4?si=uF5_LdHhvCQgtty5",
  },
  {
    title: "Primeiros passos",
    description: "Aprenda o fluxo principal para criar e acompanhar seus sites.",
    src: "https://www.youtube.com/embed/K8z1U2n_XpQ?si=llQoHU6aslC5RLF1",
  },
  {
    title: "Verificacao e ajustes",
    description: "Veja como seguir a etapa de verificacao e finalizar a configuracao.",
    src: "https://www.youtube.com/embed/ISmcbsGXl_o?si=G5x03ryDsHtTSHST",
  },
];

export default function TutorialPage() {
  return (
    <main className="pl-page max-w-7xl space-y-6">
      <div className="pl-page-title">
        <div>
          <span className="pl-badge">Central de ajuda</span>
          <h1>Tutorial</h1>
          <p>Assista aos videos de apoio para usar o painel com mais seguranca.</p>
        </div>
      </div>

      <section className="grid gap-5 lg:grid-cols-3">
        {videos.map((video) => (
          <article key={video.src} className="pl-card overflow-hidden p-0">
            <div className="p-5">
              <h2 className="text-xl font-black text-slate-950">{video.title}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">{video.description}</p>
            </div>

            <div className="border-t border-slate-100 bg-slate-950 p-3">
              <div className="aspect-video overflow-hidden rounded-[24px] bg-black">
                <iframe
                  className="h-full w-full"
                  src={video.src}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
