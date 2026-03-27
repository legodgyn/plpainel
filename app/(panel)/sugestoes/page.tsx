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
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    setLoading(true);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      showToast("Usuário não autenticado");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/feature-requests/my", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const json = await res.json();
    setList(json || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function validate() {
    if (title.trim().length < 4) {
      showToast("Título muito curto");
      return false;
    }

    if (description.trim().length < 10) {
      showToast("Descrição muito curta");
      return false;
    }

    return true;
  }

  async function send() {
    if (!validate()) return;

    setSending(true);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      showToast("Não autenticado");
      setSending(false);
      return;
    }

    const res = await fetch("/api/feature-requests/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title,
        description,
      }),
    });

    if (!res.ok) {
      showToast("Erro ao enviar");
      setSending(false);
      return;
    }

    setTitle("");
    setDescription("");
    showToast("Enviado com sucesso 🚀");

    await load();
    setSending(false);
  }

  function badge(status: string) {
    const base = "text-xs px-2 py-1 rounded";

    switch (status) {
      case "concluída":
        return `${base} bg-green-500/20 text-green-300`;
      case "em análise":
        return `${base} bg-yellow-500/20 text-yellow-300`;
      case "planejada":
        return `${base} bg-purple-500/20 text-purple-300`;
      default:
        return `${base} bg-white/10 text-white`;
    }
  }

  return (
    <div className="space-y-6 text-white">
      {toast && (
        <div className="bg-black border border-white/10 p-3 rounded text-sm">
          {toast}
        </div>
      )}

      <div className="bg-white/5 p-5 rounded-xl space-y-4">
        <h1 className="text-xl font-bold">💡 Sugestões</h1>

        <input
          placeholder="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-3 rounded bg-black/30 border border-white/10"
        />

        <textarea
          placeholder="Descreva sua ideia..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-3 rounded bg-black/30 border border-white/10"
        />

        <button
          onClick={send}
          disabled={sending}
          className="bg-purple-600 px-4 py-2 rounded"
        >
          {sending ? "Enviando..." : "Enviar"}
        </button>
      </div>

      <div className="bg-white/5 p-5 rounded-xl">
        <h2 className="mb-4 font-bold">Minhas sugestões</h2>

        {loading ? (
          <p>Carregando...</p>
        ) : list.length === 0 ? (
          <p>Nenhuma sugestão ainda.</p>
        ) : (
          list.map((item) => (
            <div key={item.id} className="mb-3 p-4 bg-black/30 rounded">
              <div className="flex justify-between">
                <div className="font-bold">{item.title}</div>
                <div className={badge(item.status)}>{item.status}</div>
              </div>

              <div className="text-sm mt-2 text-white/70">
                {item.description}
              </div>

              {item.admin_note && (
                <div className="mt-2 text-xs text-purple-300">
                  Admin: {item.admin_note}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
