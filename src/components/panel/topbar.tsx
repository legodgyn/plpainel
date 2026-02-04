"use client";

export default function Topbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b1220]/80 backdrop-blur">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="hidden sm:block text-sm text-white/60">
            Gerencie seus sites e tokens de forma simples e eficiente.
          </div>

          <div className="flex items-center gap-3">
            <a
              href="#"
              className="hidden md:flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
            >
              Quer ajuda com WhatsApp API? <span className="text-white/60">Nos chame</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
