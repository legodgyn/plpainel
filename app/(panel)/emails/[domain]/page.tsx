"use client";

import { useEffect, useMemo, useState } from "react";
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

function fmtDate(value: string) {
  try {
    return new Date(value).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function getSenderName(email?: string | null) {
  if (!email) return "Remetente desconhecido";
  const [name] = email.split("@");
  return name || email;
}

function getInitial(email?: string | null) {
  return getSenderName(email).slice(0, 1).toUpperCase() || "?";
}

function getPreview(text?: string | null) {
  const clean = String(text || "")
    .replace(/\s+/g, " ")
    .trim();

  return clean || "Sem conteudo.";
}

export default function DomainInboxPage() {
  const params = useParams<{ domain: string }>();
  const router = useRouter();

  const domain = decodeURIComponent(params.domain || "");

  const [emails, setEmails] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [onlyCodes, setOnlyCodes] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    setLoading(true);

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

    const rows = data || [];
    setEmails(rows);
    setSelectedId((current) => current || rows[0]?.id || null);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain]);

  const filteredEmails = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return emails.filter((email) => {
      if (onlyCodes && !email.detected_code) return false;
      if (!needle) return true;

      return [
        email.from_email,
        email.to_email,
        email.subject,
        email.body,
        email.detected_code,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [emails, onlyCodes, query]);

  const selectedEmail = useMemo(() => {
    return filteredEmails.find((email) => email.id === selectedId) || filteredEmails[0] || null;
  }, [filteredEmails, selectedId]);

  async function copyText(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1800);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 text-white">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <button
            onClick={() => router.push("/emails")}
            className="text-sm font-semibold text-white/55 hover:text-white"
          >
            Voltar para dominios
          </button>
          <h1 className="mt-3 text-2xl font-bold">Caixa de entrada</h1>
          <p className="mt-1 break-all text-sm text-white/55">
            Recebendo emails de <span className="font-semibold text-violet-200">{domain}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => copyText(`facebook@${domain}`, "email")}
            className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/15"
          >
            Copiar facebook@{domain}
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 disabled:opacity-50"
          >
            {loading ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
      </div>

      {copied ? (
        <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Copiado para a area de transferencia.
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="text-xs text-white/45">Total</div>
          <div className="mt-1 text-3xl font-black">{emails.length}</div>
        </div>
        <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-4">
          <div className="text-xs text-emerald-100/65">Com codigo</div>
          <div className="mt-1 text-3xl font-black text-emerald-100">
            {emails.filter((email) => email.detected_code).length}
          </div>
        </div>
        <div className="rounded-2xl border border-violet-400/15 bg-violet-500/10 p-4 md:col-span-2">
          <div className="text-xs text-violet-100/65">Endereco recomendado</div>
          <div className="mt-1 break-all text-lg font-bold text-violet-100">
            facebook@{domain}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por remetente, assunto, codigo ou conteudo..."
            className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none transition focus:border-violet-400"
          />
          <button
            onClick={() => setOnlyCodes((value) => !value)}
            className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
              onlyCodes
                ? "bg-emerald-500 text-white"
                : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            Somente codigos
          </button>
        </div>

        <div className="mt-4 grid min-h-[560px] gap-4 lg:grid-cols-[380px_1fr]">
          <aside className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
            {loading ? (
              <div className="p-5 text-sm text-white/55">Carregando emails...</div>
            ) : filteredEmails.length === 0 ? (
              <div className="p-5 text-sm text-white/55">
                Nenhum email encontrado para esse filtro.
              </div>
            ) : (
              <div className="max-h-[680px] overflow-y-auto">
                {filteredEmails.map((email) => {
                  const active = selectedEmail?.id === email.id;

                  return (
                    <button
                      key={email.id}
                      onClick={() => setSelectedId(email.id)}
                      className={`w-full border-b border-white/5 p-4 text-left transition last:border-b-0 ${
                        active ? "bg-violet-500/15" : "hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-500/15 text-sm font-black text-violet-100">
                          {getInitial(email.from_email)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <div className="truncate text-sm font-bold">
                              {email.subject || "Sem assunto"}
                            </div>
                            <div className="shrink-0 text-[11px] text-white/35">
                              {fmtDate(email.created_at)}
                            </div>
                          </div>
                          <div className="mt-1 truncate text-xs text-white/45">
                            {email.from_email || "Remetente desconhecido"}
                          </div>
                          <div className="mt-2 line-clamp-2 text-xs leading-5 text-white/55">
                            {getPreview(email.body)}
                          </div>
                          {email.detected_code ? (
                            <div className="mt-3 inline-flex rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-100">
                              Codigo {email.detected_code}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <section className="rounded-2xl border border-white/10 bg-black/20">
            {!selectedEmail ? (
              <div className="flex h-full min-h-[420px] items-center justify-center p-8 text-center text-white/55">
                Selecione um email para ler.
              </div>
            ) : (
              <div className="flex h-full min-h-[560px] flex-col">
                <div className="border-b border-white/10 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <h2 className="break-words text-xl font-black">
                        {selectedEmail.subject || "Sem assunto"}
                      </h2>
                      <div className="mt-3 grid gap-2 text-sm text-white/55">
                        <div className="break-all">
                          De:{" "}
                          <span className="font-semibold text-white/85">
                            {selectedEmail.from_email || "-"}
                          </span>
                        </div>
                        <div className="break-all">
                          Para:{" "}
                          <span className="font-semibold text-white/85">
                            {selectedEmail.to_email}
                          </span>
                        </div>
                        <div>{fmtDate(selectedEmail.created_at)}</div>
                      </div>
                    </div>

                    {selectedEmail.detected_code ? (
                      <button
                        onClick={() => copyText(selectedEmail.detected_code || "", "codigo")}
                        className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-white hover:bg-emerald-400"
                      >
                        Copiar codigo {selectedEmail.detected_code}
                      </button>
                    ) : null}
                  </div>
                </div>

                {selectedEmail.detected_code ? (
                  <div className="mx-5 mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100/70">
                      Codigo detectado
                    </div>
                    <div className="mt-2 text-3xl font-black text-emerald-100">
                      {selectedEmail.detected_code}
                    </div>
                  </div>
                ) : null}

                <div className="flex-1 p-5">
                  <div className="min-h-[340px] whitespace-pre-wrap rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm leading-7 text-white/80">
                    {selectedEmail.body || "Sem conteudo."}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
