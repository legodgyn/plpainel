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
  "em analise",
  "planejada",
  "em desenvolvimento",
  "concluida",
  "recusada",
];

type ToastState = {
  type: "success" | "error";
  text: string;
} | null;

function badge(status: string) {
  const s = String(status || "").toLowerCase();
  if (s === "concluida" || s === "concluída") return "pl-badge pl-badge-ok";
  if (s === "em analise" || s === "em análise" || s === "em desenvolvimento") return "pl-badge pl-badge-warn";
  if (s === "recusada") return "pl-badge pl-badge-danger";
  return "pl-badge";
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
  const [drafts, setDrafts] = useState<Record<string, { status: string; admin_note: string }>>({});

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

      const res = await fetch("/api/feature-requests/admin/list", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const json = await res.json().catch(() => []);
      if (!res.ok) {
        showToast("error", json?.error || "Erro ao carregar sugestoes.");
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
        showToast("error", "Voce precisa estar logado.");
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

      showToast("success", "Sugestao atualizada com sucesso.");
      await load();
    } finally {
      setSavingId(null);
    }
  }

  async function deleteItem(id: string) {
    const ok = window.confirm("Tem certeza que deseja excluir essa sugestao?");
    if (!ok) return;

    setDeletingId(id);
    try {
      const token = await getToken();
      if (!token) {
        showToast("error", "Voce precisa estar logado.");
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

      showToast("success", "Sugestao excluida com sucesso.");
      await load();
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = list.filter((item) => {
    const matchesStatus =
      statusFilter === "todos" ||
      String(item.status || "").toLowerCase() === statusFilter.toLowerCase();

    const haystack = `${item.title} ${item.description} ${item.admin_note || ""} ${item.user_id}`.toLowerCase();
    return matchesStatus && haystack.includes(q.trim().toLowerCase());
  });

  const counts = {
    total: list.length,
    enviada: list.filter((item) => String(item.status || "").toLowerCase() === "enviada").length,
    analise: list.filter((item) => ["em analise", "em análise"].includes(String(item.status || "").toLowerCase())).length,
    planejada: list.filter((item) => String(item.status || "").toLowerCase() === "planejada").length,
    concluida: list.filter((item) => ["concluida", "concluída"].includes(String(item.status || "").toLowerCase())).length,
  };

  return (
    <main className="pl-page max-w-7xl space-y-6">
      <div className="pl-page-title">
        <div>
          <span className="pl-badge">Admin</span>
          <h1>Sugestoes dos Usuarios</h1>
          <p>Acompanhe, organize e responda as melhorias enviadas pelos usuarios.</p>
        </div>

        <button type="button" onClick={load} className="pl-btn">
          Atualizar
        </button>
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

      <section className="grid gap-4 md:grid-cols-5">
        {[
          ["Total", counts.total],
          ["Enviadas", counts.enviada],
          ["Em analise", counts.analise],
          ["Planejadas", counts.planejada],
          ["Concluidas", counts.concluida],
        ].map(([label, value]) => (
          <div key={label} className="pl-card-soft">
            <div className="text-sm font-bold text-slate-500">{label}</div>
            <div className="mt-2 text-3xl font-black text-slate-950">{value}</div>
          </div>
        ))}
      </section>

      <section className="pl-card">
        <div className="grid gap-3 md:grid-cols-[1fr_240px]">
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Buscar por titulo, descricao, observacao ou user id..."
            className="pl-input"
          />

          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="pl-select">
            <option value="todos">Todos os status</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="space-y-4">
        {loading ? (
          <div className="pl-card-soft text-sm font-semibold text-slate-500">Carregando sugestoes...</div>
        ) : filtered.length === 0 ? (
          <div className="pl-card-soft text-sm font-semibold text-slate-500">Nenhuma sugestao encontrada.</div>
        ) : (
          filtered.map((item) => {
            const draft = drafts[item.id] || {
              status: item.status || "enviada",
              admin_note: item.admin_note || "",
            };

            return (
              <article key={item.id} className="pl-card">
                <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-black text-slate-950">{item.title}</h2>
                      <span className={badge(item.status)}>{item.status}</span>
                    </div>
                    <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-7 text-slate-600">
                      {item.description}
                    </p>
                    <div className="mt-4 text-xs font-semibold text-slate-400">
                      Enviado em {new Date(item.created_at).toLocaleString("pt-BR")}
                    </div>
                    <div className="mt-1 break-all text-xs font-semibold text-slate-300">User ID: {item.user_id}</div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="pl-label">Status</label>
                      <select
                        value={draft.status}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [item.id]: { ...draft, status: event.target.value },
                          }))
                        }
                        className="pl-select mt-2"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="pl-label">Observacao do admin</label>
                      <textarea
                        rows={4}
                        value={draft.admin_note}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [item.id]: { ...draft, admin_note: event.target.value },
                          }))
                        }
                        placeholder="Ex: Essa melhoria entrou no roadmap..."
                        className="pl-textarea mt-2"
                      />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button type="button" onClick={() => saveItem(item.id)} disabled={savingId === item.id} className="pl-btn pl-btn-primary">
                        {savingId === item.id ? "Salvando..." : "Salvar"}
                      </button>
                      <button type="button" onClick={() => deleteItem(item.id)} disabled={deletingId === item.id} className="pl-btn pl-btn-danger">
                        {deletingId === item.id ? "Excluindo..." : "Excluir"}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
