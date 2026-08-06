"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type AnnouncementRow = {
  id: string;
  title: string;
  content: string;
  is_published: boolean;
  created_at: string;
};

const DEFAULT_BANNER_TITLE = "Aviso importante";
const DEFAULT_BANNER_MESSAGE = "Confira este aviso antes de continuar usando a plataforma.";

export default function AdminUpdatesPage() {
  const supabase = useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [loading, setLoading] = useState(true);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [savingMaintenance, setSavingMaintenance] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPublished, setIsPublished] = useState(true);

  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceTitle, setMaintenanceTitle] = useState(DEFAULT_BANNER_TITLE);
  const [maintenanceMessage, setMaintenanceMessage] = useState(DEFAULT_BANNER_MESSAGE);

  const [items, setItems] = useState<AnnouncementRow[]>([]);

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }

  async function load() {
    setLoading(true);
    setMsg(null);

    try {
      const token = await getToken();
      if (!token) {
        setMsg("Você precisa estar logado.");
        setLoading(false);
        return;
      }

      const [annRes, maintenanceRes] = await Promise.all([
        fetch("/api/admin/announcements", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
        fetch("/api/admin/settings", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
      ]);

      const annJson = await annRes.json().catch(() => ({}));
      const maintenanceJson = await maintenanceRes.json().catch(() => ({}));

      if (!annRes.ok || !annJson?.ok) {
        setMsg(annJson?.error || "Erro ao carregar atualizações.");
      } else {
        setItems(annJson.items || []);
      }

      if (maintenanceRes.ok && maintenanceJson?.ok) {
        setMaintenanceEnabled(Boolean(maintenanceJson.data?.enabled));
        setMaintenanceTitle(maintenanceJson.data?.title || DEFAULT_BANNER_TITLE);
        setMaintenanceMessage(maintenanceJson.data?.message || DEFAULT_BANNER_MESSAGE);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreateAnnouncement() {
    setMsg(null);

    if (!title.trim()) {
      setMsg("Preencha o título.");
      return;
    }

    if (!content.trim()) {
      setMsg("Preencha o conteúdo.");
      return;
    }

    setSavingAnnouncement(true);

    try {
      const token = await getToken();
      if (!token) {
        setMsg("Você precisa estar logado.");
        return;
      }

      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          is_published: isPublished,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        setMsg(json?.error || "Erro ao salvar atualização.");
        return;
      }

      setTitle("");
      setContent("");
      setIsPublished(true);
      setMsg("Atualização publicada com sucesso.");
      await load();
    } finally {
      setSavingAnnouncement(false);
    }
  }

  async function handleSaveMaintenance() {
    setMsg(null);
    setSavingMaintenance(true);

    try {
      const token = await getToken();
      if (!token) {
        setMsg("Você precisa estar logado.");
        return;
      }

      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          enabled: maintenanceEnabled,
          title: maintenanceTitle.trim(),
          message: maintenanceMessage.trim(),
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        setMsg(json?.error || "Erro ao salvar aviso fixado.");
        return;
      }

      setMsg("Aviso fixado atualizado com sucesso.");
      await load();
    } finally {
      setSavingMaintenance(false);
    }
  }

  return (
    <div className="pl-page space-y-6 text-[var(--panel-ink)]">
      <div className="pl-card p-6">
        <h1 className="text-2xl font-black text-[var(--panel-ink)]">Atualizações e Avisos</h1>
        <p className="mt-1 text-sm font-semibold text-[var(--panel-muted)]">
          Publique novidades do sistema e ative avisos fixados para os usuários.
        </p>
      </div>

      {msg ? (
        <div className="rounded-xl border border-[var(--panel-line)] bg-[var(--panel-hover)] px-4 py-3 text-sm font-semibold text-[var(--panel-ink)]">
          {msg}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="pl-card p-5">
          <div className="text-sm font-black text-[var(--panel-ink)]">Nova atualização</div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="pl-label">Título</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Nova atualização no sistema"
                className="pl-input"
              />
            </div>

            <div>
              <label className="pl-label">Conteúdo</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                placeholder="Descreva aqui o que mudou..."
                className="pl-textarea"
              />
            </div>

            <label className="flex items-center gap-3 text-sm font-semibold text-[var(--panel-muted)]">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
              />
              Publicar agora
            </label>

            <button
              onClick={handleCreateAnnouncement}
              disabled={savingAnnouncement}
              className="pl-btn pl-btn-primary disabled:opacity-60"
            >
              {savingAnnouncement ? "Publicando..." : "Publicar atualização"}
            </button>
          </div>
        </div>

        <div className="pl-card p-5">
          <div className="text-sm font-black text-[var(--panel-ink)]">Aviso fixado</div>

          <div className="mt-4 space-y-4">
            <label className="flex items-center gap-3 text-sm font-semibold text-[var(--panel-muted)]">
              <input
                type="checkbox"
                checked={maintenanceEnabled}
                onChange={(e) => setMaintenanceEnabled(e.target.checked)}
              />
              Ativar aviso fixado no dashboard
            </label>

            <div>
              <label className="pl-label">Título do aviso</label>
              <input
                value={maintenanceTitle}
                onChange={(e) => setMaintenanceTitle(e.target.value)}
                placeholder="Ex: Aviso importante"
                className="pl-input"
              />
            </div>

            <div>
              <label className="pl-label">Mensagem</label>
              <textarea
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                rows={6}
                className="pl-textarea"
              />
            </div>

            <button
              onClick={handleSaveMaintenance}
              disabled={savingMaintenance}
              className="pl-btn pl-btn-primary disabled:opacity-60"
            >
              {savingMaintenance ? "Salvando..." : "Salvar aviso"}
            </button>
          </div>
        </div>
      </div>

      <div className="pl-card p-5">
        <div className="text-sm font-black text-[var(--panel-ink)]">Últimas atualizações</div>

        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="pl-card-soft text-sm font-semibold text-[var(--panel-muted)]">Carregando...</div>
          ) : items.length === 0 ? (
            <div className="pl-card-soft text-sm font-semibold text-[var(--panel-muted)]">Nenhuma atualização publicada.</div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-[var(--panel-line)] bg-[var(--panel-surface)] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-black text-[var(--panel-ink)]">{item.title}</div>
                  <div className="text-xs font-semibold text-[var(--panel-muted)]">
                    {new Date(item.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>

                <div className="mt-2 whitespace-pre-line text-sm font-semibold leading-6 text-[var(--panel-muted)]">
                  {item.content}
                </div>

                <div className="mt-3 text-xs">
                  {item.is_published ? (
                    <span className="pl-badge pl-badge-ok py-1">
                      Publicada
                    </span>
                  ) : (
                    <span className="pl-badge py-1">
                      Rascunho
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
