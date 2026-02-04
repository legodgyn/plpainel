"use client";

export default function WhatsappFloat() {
  // Troque pelo seu link real:
  const href = "https://wa.me/55SEUNUMEROAQUI";

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 shadow-lg hover:scale-105 transition"
      aria-label="WhatsApp"
      title="WhatsApp"
    >
      <span className="text-xl">💬</span>
    </a>
  );
}
