"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type FeatureRequest = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  updated_at?: string | null;
};

const STATUS_OPTIONS = [
  "enviada",
  "em análise",
  "planejada",
  "em desenvolvimento",
  "concluída",
  "recusada",
];

type ToastState = {
  type: "success" | "error";
  text: string;
} | null;

function badge(status: string) {
  const base = "rounded-full px-3 py-1 text-xs font-semibold border";

  switch ((status || "").toLowerCase()) {
    case "concluída":
    case "concluida":
      return `${base} border-emerald-500/20 bg-emerald-500/10 text-emerald-200`;
    case "em análise":
    case "em analise":
      return `${base} border-amber-500/20 bg-amber-500/10 text-amber-200`;
    case "planejada":
      return `${base} border-violet-500/20 bg-violet-500/10 text-violet-200`;
    case "em desenvolvimento":
      return `${base} border-blue-500/20 bg-blue-500/10 text-blue-200`;
    case "recusada":
      return `${base} border-red-500/20 bg-red-500/10 text-red-200`;
    default:
      return `${base} border-white/10 bg-white/10 text-white/80`;
  }
}

export default function AdminSugestoesPage() {
  const supabase = useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [list, setList] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  const [drafts, setDrafts] = useState<
    Record<string, { status: string; admin_note: string }>
  >({});

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

      const res = await fetch("/api/feature-requests/admin/list", {
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

      const items = Array.isArray(json) ? json : [];
      setList(items);

      const nextDrafts: Record<string, { status: string; admin_note: string }> = {};
      for (const item of items) {
        nextDrafts[item.id] = {
          status: item.status || "enviada",
          admin_note: item.admin_note || "",
        };
      }
      setDrafts(nextDrafts);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveItem(id: string) {
    const draft = drafts[id];
    if (!draft) return;

    setSavingId(id);

    try {
      const token = await getToken();
      if (!token) {
        showToast("error", "Você precisa estar logado.");
        return;
      }

      const res = await fetch("/api/feature-requests/admin/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id,
          status: draft.status,
          admin_note: draft.admin_note,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast("error", json?.error || "Erro ao salvar.");
        return;
      }

      showToast("success", "Sugestão atualizada com sucesso.");
      await load();
    } finally {
      setSavingId(null);
    }
  }

  async function deleteItem(id: string) {
    const ok = window.confirm("Tem certeza que deseja excluir essa sugestão?");
    if (!ok) return;

    setDeletingId(id);

    try {
      const token = await getToken();
      if (!token) {
        showToast("error", "Você precisa estar logado.");
        return;
      }

      const res = await fetch("/api/feature-requests/admin/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast("error", json?.error || "Erro ao excluir.");
        return;
      }

      showToast("success", "Sugestão excluída com sucesso.");
      await load();
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = list.filter((item) => {
    const matchesStatus =
      statusFilter === "todos" ||
      (item.status || "").toLowerCase() === statusFilter.toLowerCase();

    const haystack =
      `${item.title} ${item.description} ${item.admin_note || ""} ${item.user_id}`.toLowerCase();

    const matchesQuery = haystack.includes(q.trim().toLowerCase());

    return matchesStatus && matchesQuery;
  });

  const counts = {
    total: list.length,
    enviada: list.filter((x) => (x.status || "").toLowerCase() === "enviada").length,
    analise: list.filter((x) => (x.status || "").toLowerCase() === "em análise").length,
    planejada: list.filter((x) => (x.status || "").toLowerCase() === "planejada").length,
    desenvolvimento: list.filter(
      (x) => (x.status || "").toLowerCase() === "em desenvolvimento"
    ).length,
    concluida: list.filter((x) => (x.status || "").toLowerCase() === "concluída").length,
  };

  return (
    <div className="space-y-6 text-white">
      {toast ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            toast.type === "success"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/20 bg-red-500/10 text-red-200"
          }`}
        >
          {toast.text}
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Sugestões dos usuários</h1>
            <p className="mt-1 text-sm text-white/60">
              Acompanhe, organize e responda as melhorias enviadas pelos usuários.
            </p>
          </div>

          <button
            onClick={load}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
          >
            Atualizar
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs text-white/50">Total</div>
          <div className="mt-2 text-2xl font-bold">{counts.total}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs text-white/50">Enviadas</div>
          <div className="mt-2 text-2xl font-bold">{counts.enviada}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs text-white/50">Em análise</div>
          <div className="mt-2 text-2xl font-bold">{counts.analise}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs text-white/50">Planejadas</div>
          <div className="mt-2 text-2xl font-bold">{counts.planejada}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs text-white/50">Concluídas</div>
          <div className="mt-2 text-2xl font-bold">{counts.concluida}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_240px]">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por título, descrição, observação ou user id..."
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-violet-400"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-violet-400"
          >
            <option value="todos">Todos os status</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/60">
            Carregando sugestões...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/60">
            Nenhuma sugestão encontrada.
          </div>
        ) : (
          filtered.map((item) => {
            const draft = drafts[item.id] || {
              status: item.status || "enviada",
              admin_note: item.admin_note || "",
            };

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_10px_30px_rgba(0,0,0,.25)]"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-lg font-bold text-white">{item.title}</div>
                      <span className={badge(item.status)}>{item.status}</span>
                    </div>

                    <div className="mt-3 whitespace-pre-line text-sm leading-7 text-white/75">
                      {item.description}
                    </div>

                    <div className="mt-4 text-xs text-white/40">
                      Enviado em {new Date(item.created_at).toLocaleString("pt-BR")}
                    </div>

                    <div className="mt-1 break-all text-xs text-white/30">
                      User ID: {item.user_id}
                    </div>
                  </div>

                  <div className="w-full max-w-xl space-y-4">
                    <div>
                      <label className="mb-1 block text-xs text-white/60">Status</label>
                      <select
                        value={draft.status}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...draft,
                              status: e.target.value,
                            },
                          }))
                        }
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-violet-400"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-white/60">
                        Observação do admin
                      </label>
                      <textarea
                        rows={4}
                        value={draft.admin_note}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...draft,
                              admin_note: e.target.value,
                            },
                          }))
                        }
                        placeholder="Ex: Essa melhoria entrou no roadmap e será feita em breve..."
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-violet-400"
                      />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => saveItem(item.id)}
                        disabled={savingId === item.id}
                        className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
                      >
                        {savingId === item.id ? "Salvando..." : "Salvar"}
                      </button>

                      <button
                        onClick={() => deleteItem(item.id)}
                        disabled={deletingId === item.id}
                        className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/15 disabled:opacity-60"
                      >
                        {deletingId === item.id ? "Excluindo..." : "Excluir"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
