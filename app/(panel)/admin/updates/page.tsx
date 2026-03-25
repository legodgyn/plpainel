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

type MaintenanceResponse = {
  enabled: boolean;
  message: string;
};

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
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    "Nosso sistema está em manutenção temporária. Algumas funções podem apresentar instabilidade."
  );

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
        setMaintenanceMessage(
          maintenanceJson.data?.message ||
            "Nosso sistema está em manutenção temporária. Algumas funções podem apresentar instabilidade."
        );
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
          message: maintenanceMessage.trim(),
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        setMsg(json?.error || "Erro ao salvar modo manutenção.");
        return;
      }

      setMsg("Modo manutenção atualizado com sucesso.");
      await load();
    } finally {
      setSavingMaintenance(false);
    }
  }

  return (
    <div className="space-y-6 text-white">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-xl font-semibold">Atualizações e Manutenção</h1>
        <p className="mt-1 text-sm text-white/60">
          Publique novidades do sistema e ative avisos de manutenção para os usuários.
        </p>
      </div>

      {msg ? (
        <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/80">
          {msg}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold">Nova atualização</div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs text-white/60">Título</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Nova atualização no sistema"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-violet-400"
              />
            </div>

            <div>
              <label className="text-xs text-white/60">Conteúdo</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                placeholder="Descreva aqui o que mudou..."
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-violet-400"
              />
            </div>

            <label className="flex items-center gap-3 text-sm text-white/80">
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
              className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
            >
              {savingAnnouncement ? "Publicando..." : "Publicar atualização"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold">Modo manutenção</div>

          <div className="mt-4 space-y-4">
            <label className="flex items-center gap-3 text-sm text-white/80">
              <input
                type="checkbox"
                checked={maintenanceEnabled}
                onChange={(e) => setMaintenanceEnabled(e.target.checked)}
              />
              Ativar aviso de manutenção
            </label>

            <div>
              <label className="text-xs text-white/60">Mensagem</label>
              <textarea
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                rows={6}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-violet-400"
              />
            </div>

            <button
              onClick={handleSaveMaintenance}
              disabled={savingMaintenance}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              {savingMaintenance ? "Salvando..." : "Salvar manutenção"}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="text-sm font-semibold">Últimas atualizações</div>

        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="text-sm text-white/60">Carregando...</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-white/60">Nenhuma atualização publicada.</div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-white">{item.title}</div>
                  <div className="text-xs text-white/45">
                    {new Date(item.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>

                <div className="mt-2 whitespace-pre-line text-sm text-white/70">
                  {item.content}
                </div>

                <div className="mt-3 text-xs">
                  {item.is_published ? (
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-emerald-200">
                      Publicada
                    </span>
                  ) : (
                    <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-white/70">
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