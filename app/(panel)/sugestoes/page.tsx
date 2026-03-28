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
  if (s === "em análise" || s === "em analise") return "Em análise";
  if (s === "planejada") return "Planejada";
  if (s === "em desenvolvimento") return "Em desenvolvimento";
  if (s === "concluída" || s === "concluida") return "Concluída";
  if (s === "recusada") return "Recusada";

  return status || "Enviada";
}

function statusClasses(status: string) {
  const s = String(status || "").toLowerCase();

  if (s === "enviada") {
    return "border-slate-400/20 bg-slate-400/10 text-slate-200";
  }

  if (s === "em análise" || s === "em analise") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-200";
  }

  if (s === "planejada") {
    return "border-violet-400/20 bg-violet-400/10 text-violet-200";
  }

  if (s === "em desenvolvimento") {
    return "border-blue-400/20 bg-blue-400/10 text-blue-200";
  }

  if (s === "concluída" || s === "concluida") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  }

  if (s === "recusada") {
    return "border-rose-400/20 bg-rose-400/10 text-rose-200";
  }

  return "border-slate-400/20 bg-slate-400/10 text-slate-200";
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
        showToast("error", "Você precisa estar logado.");
        setList([]);
        return;
      }

      const res = await fetch("/api/feature-requests/my", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const json = await res.json().catch(() => ([]));

      if (!res.ok) {
        showToast("error", json?.error || "Erro ao carregar sugestões.");
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
      showToast("error", "O título precisa ter pelo menos 4 caracteres.");
      return false;
    }

    if (description.trim().length < 10) {
      showToast("error", "A descrição precisa ter pelo menos 10 caracteres.");
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
        showToast("error", "Usuário não autenticado.");
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
        showToast("error", json?.error || "Erro ao enviar sugestão.");
        return;
      }

      setTitle("");
      setDescription("");
      showToast("success", "Sugestão enviada com sucesso.");
      await load();
    } finally {
      setSending(false);
    }
  }

  async function deleteOwnSuggestion(id: string) {
    const ok = window.confirm("Tem certeza que deseja excluir esta sugestão?");
    if (!ok) return;

    setDeletingId(id);

    try {
      const token = await getToken();
      if (!token) {
        showToast("error", "Usuário não autenticado.");
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
        showToast("error", json?.error || "Erro ao excluir sugestão.");
        return;
      }

      showToast("success", "Sugestão excluída com sucesso.");
      await load();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6 text-white">
      {toast ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            toast.type === "success"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/20 bg-red-500/10 text-red-200"
          }`}
        >
          {toast.text}
        </div>
      ) : null}

      <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.03] p-6 shadow-[0_10px_40px_rgba(0,0,0,.25)]">
        <div className="mb-5">
          <h1 className="text-2xl font-bold">💡 Sugestões e melhorias</h1>
          <p className="mt-1 text-sm text-white/60">
            Envie ideias para melhorar a plataforma e acompanhe o retorno da equipe.
          </p>
        </div>

        <div className="space-y-4">
          <input
            placeholder="Título da sugestão"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#0f172a]/70 px-4 py-3 text-white outline-none transition focus:border-fuchsia-400"
          />

          <textarea
            placeholder="Descreva sua ideia com detalhes..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="w-full rounded-2xl border border-white/10 bg-[#0f172a]/70 px-4 py-3 text-white outline-none transition focus:border-fuchsia-400"
          />

          <div className="flex gap-3">
            <button
              onClick={send}
              disabled={sending}
              className="rounded-2xl bg-fuchsia-500 px-5 py-3 text-sm font-bold text-white shadow-[0_0_30px_rgba(217,70,239,.25)] transition hover:bg-fuchsia-400 disabled:opacity-60"
            >
              {sending ? "Enviando..." : "Enviar sugestão"}
            </button>

            <button
              type="button"
              onClick={() => {
                setTitle("");
                setDescription("");
              }}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80 hover:bg-white/10"
            >
              Limpar
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.03] p-6 shadow-[0_10px_40px_rgba(0,0,0,.25)]">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Minhas sugestões</h2>
            <p className="mt-1 text-sm text-white/60">
              Veja o andamento e as respostas do admin.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/60">
            {loading ? "Carregando..." : `${list.length} item(ns)`}
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-white/60">
              Carregando sugestões...
            </div>
          ) : list.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-white/60">
              Nenhuma sugestão enviada ainda.
            </div>
          ) : (
            list.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-white/10 bg-[#0b1220]/80 p-5 transition hover:border-white/15"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-bold text-white">{item.title}</div>

                    <div className="mt-3 whitespace-pre-line text-sm leading-7 text-white/75">
                      {item.description}
                    </div>

                    <div className="mt-4 text-xs text-white/35">
                      Enviado em {new Date(item.created_at).toLocaleString("pt-BR")}
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(
                        item.status
                      )}`}
                    >
                      {statusLabel(item.status)}
                    </span>

                    <button
                      onClick={() => deleteOwnSuggestion(item.id)}
                      disabled={deletingId === item.id}
                      className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/15 disabled:opacity-60"
                    >
                      {deletingId === item.id ? "Excluindo..." : "Excluir"}
                    </button>
                  </div>
                </div>

                {item.admin_note ? (
                  <div className="mt-4 rounded-2xl border border-fuchsia-500/15 bg-fuchsia-500/10 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-fuchsia-200/80">
                      Resposta do admin
                    </div>
                    <div className="mt-2 whitespace-pre-line text-sm leading-7 text-fuchsia-100">
                      {item.admin_note}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/45">
                    Ainda sem resposta da equipe.
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
