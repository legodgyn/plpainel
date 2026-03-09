"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

type UserRow = {
  user_id: string;
  created_at: string | null;
  email: string | null;
  name: string | null;
  whatsapp: string | null;
  whatsapp_link: string | null;
  affiliate_code: string | null;
  total_spent_cents: number;
  total_spent_label: string;
};

function fmt(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

export default function UsersAdminPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setMsg(null);
    setLoading(true);

    const { data: auth } = await supabase.auth.getSession();
    const token = auth?.session?.access_token;

    if (!token) {
      setMsg("Você precisa estar logado.");
      setLoading(false);
      return;
    }

    const r = await fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.ok) {
      setMsg(j?.error || "Erro ao carregar usuários.");
      setLoading(false);
      return;
    }

    setRows(j.users || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6 text-white">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Usuários</h1>
            <p className="mt-1 text-sm text-white/60">
              Visualize todos os usuários cadastrados na plataforma.
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

      {msg ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {msg}
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-white/70">
              <tr className="border-b border-white/10">
                <th className="py-3 text-left font-medium">Data de registro</th>
                <th className="py-3 text-left font-medium">E-mail</th>
                <th className="py-3 text-left font-medium">WhatsApp</th>
                <th className="py-3 text-left font-medium">Afiliado</th>
                <th className="py-3 text-left font-medium">Valor gasto</th>
                <th className="py-3 text-left font-medium">Ação</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-6 text-white/60">
                    Carregando...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-white/60">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                rows.map((u) => (
                  <tr key={u.user_id} className="hover:bg-white/5">
                    <td className="py-3 text-white/70">{fmt(u.created_at)}</td>

                    <td className="py-3">
                      <div className="font-semibold text-white/90">{u.email || "—"}</div>
                      {u.name ? (
                        <div className="text-[11px] text-white/40">{u.name}</div>
                      ) : null}
                    </td>

                    <td className="py-3">
                      {u.whatsapp ? (
                        <span className="font-semibold text-emerald-300">{u.whatsapp}</span>
                      ) : (
                        <span className="text-white/50">—</span>
                      )}
                    </td>

                    <td className="py-3">
                      {u.affiliate_code ? (
                        <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs text-violet-200">
                          {u.affiliate_code}
                        </span>
                      ) : (
                        <span className="text-white/50">—</span>
                      )}
                    </td>

                    <td className="py-3 font-semibold">{u.total_spent_label}</td>

                    <td className="py-3">
                      {u.whatsapp_link ? (
                        <a
                          href={u.whatsapp_link}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                        >
                          Falar no WhatsApp
                        </a>
                      ) : (
                        <span className="text-white/50">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}