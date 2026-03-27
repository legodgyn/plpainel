"use client";

import { useEffect, useState } from "react";

export default function AdminSugestoes() {
  const [list, setList] = useState<any[]>([]);

  async function load() {
    const res = await fetch("/api/feature-requests/admin/list");
    const data = await res.json();
    setList(data);
  }

  async function update(id: string, status: string) {
    await fetch("/api/feature-requests/admin/update", {
      method: "POST",
      body: JSON.stringify({ id, status }),
    });

    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4 text-white">
      <h1 className="text-xl font-bold">📊 Sugestões dos usuários</h1>

      {list.map((item) => (
        <div key={item.id} className="bg-white/5 p-4 rounded">
          <div className="font-bold">{item.title}</div>
          <div className="text-sm">{item.description}</div>

          <div className="text-xs mt-2">
            Status: <b>{item.status}</b>
          </div>

          <div className="flex gap-2 mt-3">
            <button onClick={() => update(item.id, "em análise")}>Análise</button>
            <button onClick={() => update(item.id, "planejada")}>Planejada</button>
            <button onClick={() => update(item.id, "concluída")}>Concluída</button>
          </div>
        </div>
      ))}
    </div>
  );
}