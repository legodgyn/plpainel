"use client";

import { useEffect, useState } from "react";

export default function SugestoesPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [list, setList] = useState<any[]>([]);

  async function load() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) return;

  const res = await fetch("/api/feature-requests/my", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const dataRes = await res.json();
  setList(dataRes);
}

  async function send() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    alert("Usuário não autenticado");
    return;
  }

  const res = await fetch("/api/feature-requests/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title, description }),
  });

  const json = await res.json();

  if (!res.ok) {
    alert(json.error || "Erro ao enviar");
    return;
  }

  setTitle("");
  setDescription("");
  load();
}

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6 text-white">
      <h1 className="text-xl font-bold">💡 Sugestões e Melhorias</h1>

      <div className="bg-white/5 p-4 rounded-xl space-y-3">
        <input
          placeholder="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 rounded bg-black/40"
        />

        <textarea
          placeholder="Descreva sua ideia..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2 rounded bg-black/40"
        />

        <button
          onClick={send}
          className="bg-purple-600 px-4 py-2 rounded"
        >
          Enviar sugestão
        </button>
      </div>

      <div>
        <h2 className="mb-2 font-semibold">Minhas sugestões</h2>

        {list.map((item) => (
          <div key={item.id} className="bg-white/5 p-4 rounded mb-2">
            <div className="font-bold">{item.title}</div>
            <div className="text-sm text-white/70">{item.description}</div>

            <div className="text-xs mt-2">
              Status: <b>{item.status}</b>
            </div>

            {item.admin_note && (
              <div className="text-xs mt-1 text-purple-300">
                Admin: {item.admin_note}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
