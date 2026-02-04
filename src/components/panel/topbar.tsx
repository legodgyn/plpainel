import Link from "next/link";

export default function TopBar() {
  return (
    <div className="sticky top-0 z-20">
      <div className="mx-auto max-w-[1180px] px-6 pt-5">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-5 py-3 flex items-center justify-between">
          <div className="text-white/70 text-sm">
            Quer que o nosso time especialista em contingência, automações, WhatsApp API e tudo que envolva WhatsApp te ajude?
          </div>

          <Link
            href="https://wa.me/"
            target="_blank"
            className="ml-4 shrink-0 rounded-xl bg-violet-600 hover:bg-violet-500 transition px-4 py-2 text-white font-semibold"
          >
            Nos chame
          </Link>
        </div>
      </div>
    </div>
  );
}
