"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type FeatureRequest = {
  id: string;
  title: string;
  description: string;
  status: string;
  admin_note: string | null;
  created_at: string;
};

type ToastState = {
  type: "success" | "error";
  text: string;
} | null;

function statusLabel(status: string) {
  const s = String(status || "").toLowerCase();
  if (s === "enviada") return "Enviada";
  if (s === "em analise" || s === "em análise") return "Em analise";
  if (s === "planejada") return "Planejada";
  if (s === "em desenvolvimento") return "Em desenvolvimento";
  if (s === "concluida" || s === "concluída") return "Concluida";
  if (s === "recusada") return "Recusada";
  return status || "Enviada";
}

function statusClasses(status: string) {
  const s = String(status || "").toLowerCase();
  if (s === "concluida" || s === "concluída") return "pl-badge pl-badge-ok";
  if (s === "recusada") return "pl-badge pl-badge-danger";
  if (s === "em analise" || s === "em análise" || s === "em desenvolvimento") return "pl-badge pl-badge-warn";
  return "pl-badge";
}

export default function SugestoesPage() {
  const supabase = useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [list, setList] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  function showToast(type: "success" | "error", text: string) {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 3000);
  }

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }

  async function load() {
    setLoading(true);

    try {
      const token = await getToken();
      if (!token) {
        showToast("error", "Voce precisa estar logado.");
        setList([]);
        return;
      }

      const res = await fetch("/api/feature-requests/my", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const json = await res.json().catch(() => []);
      if (!res.ok) {
        showToast("error", json?.error || "Erro ao carregar sugestoes.");
        setList([]);
        return;
      }

      setList(Array.isArray(json) ? json : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function validate() {
    if (title.trim().length < 4) {
      showToast("error", "O titulo precisa ter pelo menos 4 caracteres.");
      return false;
    }

    if (description.trim().length < 10) {
      showToast("error", "A descricao precisa ter pelo menos 10 caracteres.");
      return false;
    }

    return true;
  }

  async function send() {
    if (!validate()) return;
    setSending(true);

    try {
      const token = await getToken();
      if (!token) {
        showToast("error", "Usuario nao autenticado.");
        return;
      }

      const res = await fetch("/api/feature-requests/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast("error", json?.error || "Erro ao enviar sugestao.");
        return;
      }

      setTitle("");
      setDescription("");
      showToast("success", "Sugestao enviada com sucesso.");
      await load();
    } finally {
      setSending(false);
    }
  }

  async function deleteOwnSuggestion(id: string) {
    const ok = window.confirm("Tem certeza que deseja excluir esta sugestao?");
    if (!ok) return;

    setDeletingId(id);

    try {
      const token = await getToken();
      if (!token) {
        showToast("error", "Usuario nao autenticado.");
        return;
      }

      const res = await fetch("/api/feature-requests/delete-own", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast("error", json?.error || "Erro ao excluir sugestao.");
        return;
      }

      showToast("success", "Sugestao excluida com sucesso.");
      await load();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="pl-page max-w-7xl space-y-6">
      <div className="pl-page-title">
        <div>
          <span className="pl-badge">Feedback</span>
          <h1>Sugestoes e Melhorias</h1>
          <p>Envie ideias para evoluir a plataforma e acompanhe o retorno da equipe.</p>
        </div>
      </div>

      {toast ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {toast.text}
        </div>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
        <div className="pl-card">
          <div className="pl-card-head">
            <div>
              <h2>Nova sugestao</h2>
              <p>Conte o que melhoraria seu trabalho dentro do painel.</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="pl-label">Titulo</label>
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex: Melhorar tela de dominios" className="pl-input mt-2" />
            </div>

            <div>
              <label className="pl-label">Descricao</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Descreva sua ideia com detalhes..."
                rows={7}
                className="pl-textarea mt-2"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={send} disabled={sending} className="pl-btn pl-btn-primary">
                {sending ? "Enviando..." : "Enviar sugestao"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTitle("");
                  setDescription("");
                }}
                className="pl-btn"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>

        <div className="pl-card">
          <div className="pl-card-head">
            <div>
              <h2>Minhas sugestoes</h2>
              <p>{loading ? "Carregando..." : `${list.length} item(ns) enviados`}</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {loading ? (
              <div className="pl-card-soft text-sm font-semibold text-slate-500">Carregando sugestoes...</div>
            ) : list.length === 0 ? (
              <div className="pl-card-soft text-sm font-semibold text-slate-500">Nenhuma sugestao enviada ainda.</div>
            ) : (
              list.map((item) => (
                <article key={item.id} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-black text-slate-950">{item.title}</h3>
                      <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-6 text-slate-600">{item.description}</p>
                      <p className="mt-3 text-xs font-semibold text-slate-400">
                        Enviado em {new Date(item.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      <span className={statusClasses(item.status)}>{statusLabel(item.status)}</span>
                      <button
                        type="button"
                        onClick={() => deleteOwnSuggestion(item.id)}
                        disabled={deletingId === item.id}
                        className="pl-btn pl-btn-danger py-2 text-xs"
                      >
                        {deletingId === item.id ? "Excluindo..." : "Excluir"}
                      </button>
                    </div>
                  </div>

                  {item.admin_note ? (
                    <div className="mt-4 rounded-[22px] border border-emerald-100 bg-emerald-50 p-4">
                      <div className="text-xs font-black uppercase tracking-wide text-emerald-700">Resposta do admin</div>
                      <div className="mt-2 whitespace-pre-line text-sm font-semibold leading-6 text-emerald-900">{item.admin_note}</div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                      Ainda sem resposta da equipe.
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
