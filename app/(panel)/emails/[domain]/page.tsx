"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

type EmailRow = {
  id: string;
  from_email: string | null;
  to_email: string;
  subject: string | null;
  body: string | null;
  detected_code: string | null;
  created_at: string;
};

export default function DomainInboxPage() {
  const params = useParams<{ domain: string }>();
  const router = useRouter();

  const domain = decodeURIComponent(params.domain || "");

  const [emails, setEmails] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;

      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("domain_inbox_emails")
        .select("id, from_email, to_email, subject, body, detected_code, created_at")
        .eq("user_id", user.id)
        .eq("domain", domain)
        .order("created_at", { ascending: false });

      setEmails(data || []);
      setLoading(false);
    }

    load();
  }, [domain, router]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 text-white">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <button
          onClick={() => router.push("/emails")}
          className="mb-4 text-sm text-white/60 hover:text-white"
        >
          ← Voltar
        </button>

        <h1 className="text-2xl font-bold">Inbox: {domain}</h1>
        <p className="mt-1 text-sm text-white/60">
          Use qualquer endereço desse domínio. Ex: facebook@{domain}
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="text-white/60">Carregando e-mails...</div>
        ) : emails.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white/60">
            Nenhum e-mail recebido ainda.
          </div>
        ) : (
          emails.map((email) => (
            <div
              key={email.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-bold">
                    {email.subject || "Sem assunto"}
                  </div>
                  <div className="mt-1 text-sm text-white/60">
                    De: {email.from_email || "—"}
                  </div>
                  <div className="text-sm text-white/60">
                    Para: {email.to_email}
                  </div>
                </div>

                <div className="text-xs text-white/40">
                  {new Date(email.created_at).toLocaleString("pt-BR")}
                </div>
              </div>

              {email.detected_code && (
                <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-emerald-200">
                  Código detectado:{" "}
                  <span className="font-bold">{email.detected_code}</span>
                </div>
              )}

              <pre className="mt-4 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl bg-black/30 p-4 text-sm text-white/75">
                {email.body || "Sem conteúdo."}
              </pre>
            </div>
          ))
        )}
      </div>
    </main>
  );
}