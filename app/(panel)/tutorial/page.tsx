"use client";

export default function TutorialPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 text-white">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-bold">Tutorial de Verificação</h1>
        <p className="mt-2 text-sm text-white/60">
          Assista ao vídeo abaixo para aprender a verificar sua BM.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
          <div className="aspect-video w-full">
            <iframe
              className="h-full w-full"
              src="https://www.youtube.com/embed/SEU_VIDEO_ID_AQUI"
              title="Tutorial da Plataforma"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
          <h2 className="text-lg font-semibold">O que você vai aprender</h2>

          <div className="mt-4 space-y-3 text-sm leading-7 text-white/75">
            <p>Como verificar sua BM em tempo recorde.</p>
          </div>
        </div>
      </div>
    </main>
  );
}