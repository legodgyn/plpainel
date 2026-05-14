"use client";

import { useEffect, useMemo, useState } from "react";
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
  token_balance?: number | null;
};

function fmt(iso?: string | null) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

function tokenBadgeClass(balance: number) {
  if (balance <= 0) return "pl-badge pl-badge-danger";
  if (balance < 10) return "pl-badge pl-badge-warn";
  return "pl-badge pl-badge-ok";
}

export default function UsersAdminPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [affiliateFilter, setAffiliateFilter] = useState("all");
  const [tokenFilter, setTokenFilter] = useState("all");

  async function load() {
    setMsg(null);
    setLoading(true);

    const { data: auth } = await supabase.auth.getSession();
    const token = auth?.session?.access_token;

    if (!token) {
      setMsg("Voce precisa estar logado.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) {
      setMsg(json?.error || "Erro ao carregar usuarios.");
      setLoading(false);
      return;
    }

    setRows(json.users || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    return rows.filter((user) => {
      const tokenBalance = Number(user.token_balance || 0);
      const matchesSearch =
        !term ||
        String(user.email || "").toLowerCase().includes(term) ||
        String(user.name || "").toLowerCase().includes(term) ||
        String(user.whatsapp || "").toLowerCase().includes(term) ||
        String(user.affiliate_code || "").toLowerCase().includes(term);

      const matchesAffiliate =
        affiliateFilter === "all" ||
        (affiliateFilter === "yes" && !!user.affiliate_code) ||
        (affiliateFilter === "no" && !user.affiliate_code);

      const matchesTokens =
        tokenFilter === "all" ||
        (tokenFilter === "zero" && tokenBalance === 0) ||
        (tokenFilter === "low" && tokenBalance > 0 && tokenBalance < 10) ||
        (tokenFilter === "high" && tokenBalance >= 10);

      return matchesSearch && matchesAffiliate && matchesTokens;
    });
  }, [rows, search, affiliateFilter, tokenFilter]);

  const totalSpent = filteredRows.reduce((sum, user) => sum + Number(user.total_spent_cents || 0), 0);
  const withWhatsapp = filteredRows.filter((user) => !!user.whatsapp).length;

  return (
    <main className="pl-page max-w-7xl space-y-6">
      <div className="pl-page-title">
        <div>
          <span className="pl-badge">Admin</span>
          <h1>Usuarios</h1>
          <p>Visualize clientes, saldo de tokens, gasto acumulado e contato de WhatsApp.</p>
        </div>

        <button type="button" onClick={load} className="pl-btn">
          Atualizar
        </button>
      </div>

      {msg ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {msg}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="pl-card-soft">
          <div className="text-sm font-bold text-slate-500">Usuarios filtrados</div>
          <div className="mt-2 text-3xl font-black text-slate-950">{filteredRows.length}</div>
        </div>
        <div className="pl-card-soft">
          <div className="text-sm font-bold text-slate-500">Valor gasto</div>
          <div className="mt-2 text-3xl font-black text-slate-950">
            {(totalSpent / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </div>
        </div>
        <div className="pl-card-soft">
          <div className="text-sm font-bold text-slate-500">Com WhatsApp</div>
          <div className="mt-2 text-3xl font-black text-slate-950">{withWhatsapp}</div>
        </div>
      </section>

      <section className="pl-card">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="pl-label">Buscar</label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por e-mail, nome, WhatsApp ou afiliado"
              className="pl-input mt-2"
            />
          </div>

          <div>
            <label className="pl-label">Afiliado</label>
            <select value={affiliateFilter} onChange={(event) => setAffiliateFilter(event.target.value)} className="pl-select mt-2">
              <option value="all">Todos</option>
              <option value="yes">Somente afiliados</option>
              <option value="no">Sem afiliado</option>
            </select>
          </div>

          <div>
            <label className="pl-label">Tokens</label>
            <select value={tokenFilter} onChange={(event) => setTokenFilter(event.target.value)} className="pl-select mt-2">
              <option value="all">Todos</option>
              <option value="zero">0 tokens</option>
              <option value="low">1 a 9 tokens</option>
              <option value="high">10+ tokens</option>
            </select>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="pl-table">
            <thead>
              <tr>
                <th>Registro</th>
                <th>E-mail</th>
                <th>WhatsApp</th>
                <th>Afiliado</th>
                <th>Valor gasto</th>
                <th>Tokens</th>
                <th>Acao</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7}>Carregando...</td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7}>Nenhum usuario encontrado.</td>
                </tr>
              ) : (
                filteredRows.map((user) => {
                  const tokenBalance = Number(user.token_balance || 0);

                  return (
                    <tr key={user.user_id}>
                      <td>{fmt(user.created_at)}</td>
                      <td>
                        <div className="font-black text-slate-950">{user.email || "-"}</div>
                        {user.name ? <div className="text-xs font-semibold text-slate-400">{user.name}</div> : null}
                      </td>
                      <td>{user.whatsapp || "-"}</td>
                      <td>
                        {user.affiliate_code ? <span className="pl-badge">{user.affiliate_code}</span> : "-"}
                      </td>
                      <td className="font-black text-slate-950">{user.total_spent_label}</td>
                      <td>
                        <span className={tokenBadgeClass(tokenBalance)}>{tokenBalance}</span>
                      </td>
                      <td>
                        {user.whatsapp_link ? (
                          <a href={user.whatsapp_link} target="_blank" rel="noreferrer" className="pl-btn py-2 text-xs">
                            WhatsApp
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
