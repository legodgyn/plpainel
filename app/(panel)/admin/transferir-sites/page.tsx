'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseBrowser';

type UserRow = {
  id: string;
  email: string | null;
  name: string | null;
  whatsapp: string | null;
};

type SiteRow = {
  id: string;
  slug: string;
  company_name: string | null;
};

export default function AdminTransferSitesPage() {

  const [users, setUsers] = useState<UserRow[]>([]);
  const [sites, setSites] = useState<SiteRow[]>([]);

  const [fromUser, setFromUser] = useState('');
  const [toUser, setToUser] = useState('');

  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');

  const [selectedSites, setSelectedSites] = useState<string[]>([]);

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingSites, setLoadingSites] = useState(false);
  const [saving, setSaving] = useState(false);

  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {

    setLoadingUsers(true);
    setMsg(null);

    const { data: auth } = await supabase.auth.getSession();
    const token = auth?.session?.access_token;

    const r = await fetch('/api/admin/users', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    const j = await r.json();

    if (!r.ok || !j?.ok) {
      setMsg(j?.error || 'Erro ao carregar usuários');
      setLoadingUsers(false);
      return;
    }

    const list = (j.users || []).map((u: any) => ({
      id: u.user_id,
      email: u.email,
      name: u.name,
      whatsapp: u.whatsapp,
    }));

    setUsers(list);
    setLoadingUsers(false);
  }

  async function loadSites(userId: string) {

    setLoadingSites(true);
    setSites([]);

    const { data, error } = await supabase
      .from('sites')
      .select('id,slug,company_name')
      .eq('user_id', userId)
      .order('slug');

    if (error) {
      setMsg(error.message);
      setLoadingSites(false);
      return;
    }

    setSites(data || []);
    setSelectedSites([]);
    setLoadingSites(false);
  }

  function toggleSite(id: string) {

    setSelectedSites((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  }

  async function handleTransfer() {

    setMsg(null);

    if (!fromUser || !toUser) {
      setMsg('Selecione usuário de origem e destino');
      return;
    }

    if (selectedSites.length === 0) {
      setMsg('Selecione pelo menos 1 site');
      return;
    }

    setSaving(true);

    const { data: auth } = await supabase.auth.getSession();
    const token = auth?.session?.access_token;

    const r = await fetch('/api/admin/transfer-site', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        from_user_id: fromUser,
        to_user_id: toUser,
        site_ids: selectedSites,
      }),
    });

    const j = await r.json();

    if (!r.ok || !j?.ok) {
      setMsg(j?.error || 'Erro ao transferir');
      setSaving(false);
      return;
    }

    setMsg(`Transferidos ${j.transferred} site(s)`);
    await loadSites(fromUser);
    setSaving(false);
  }

  const filteredFromUsers = useMemo(() => {

    return users.filter((u) =>
      `${u.email} ${u.name} ${u.whatsapp}`
        .toLowerCase()
        .includes(searchFrom.toLowerCase())
    );

  }, [users, searchFrom]);

  const filteredToUsers = useMemo(() => {

    return users.filter((u) =>
      `${u.email} ${u.name} ${u.whatsapp}`
        .toLowerCase()
        .includes(searchTo.toLowerCase())
    );

  }, [users, searchTo]);

  return (

    <div className="space-y-6 text-white">

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-xl font-semibold">Transferir Sites</h1>
        <p className="text-sm text-white/60 mt-1">
          Selecione usuário de origem, escolha os sites e transfira para outro usuário.
        </p>
      </div>

      {msg && (
        <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm">
          {msg}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">

        {/* ORIGEM */}

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">

          <div className="text-sm font-semibold mb-2">
            Usuário de origem
          </div>

          <input
            placeholder="Buscar usuário..."
            value={searchFrom}
            onChange={(e) => setSearchFrom(e.target.value)}
            className="w-full mb-3 rounded-xl bg-black/30 border border-white/10 px-4 py-3"
          />

          <select
            value={fromUser}
            onChange={(e) => {
              setFromUser(e.target.value);
              loadSites(e.target.value);
            }}
            className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white"
          >
            <option value="">Selecione</option>

            {filteredFromUsers.map((u) => (
              <option
                key={u.id}
                value={u.id}
                className="bg-[#0f172a] text-white"
              >
                {u.email}
              </option>
            ))}
          </select>

          <div className="mt-6 text-sm font-semibold mb-2">
            Sites do usuário
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">

            {loadingSites && (
              <div className="text-white/60 text-sm">
                Carregando sites...
              </div>
            )}

            {!loadingSites &&
              sites.map((s) => (

                <label
                  key={s.id}
                  className="flex items-center gap-3 rounded-xl bg-black/40 px-3 py-2 hover:bg-black/60"
                >

                  <input
                    type="checkbox"
                    checked={selectedSites.includes(s.id)}
                    onChange={() => toggleSite(s.id)}
                  />

                  <span className="text-sm">
                    {s.slug}
                  </span>

                </label>

              ))}

          </div>

        </div>

        {/* DESTINO */}

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">

          <div className="text-sm font-semibold mb-2">
            Usuário de destino
          </div>

          <input
            placeholder="Buscar usuário..."
            value={searchTo}
            onChange={(e) => setSearchTo(e.target.value)}
            className="w-full mb-3 rounded-xl bg-black/30 border border-white/10 px-4 py-3"
          />

          <select
            value={toUser}
            onChange={(e) => setToUser(e.target.value)}
            className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white"
          >
            <option value="">Selecione</option>

            {filteredToUsers.map((u) => (
              <option
                key={u.id}
                value={u.id}
                className="bg-[#0f172a] text-white"
              >
                {u.email}
              </option>
            ))}
          </select>

          <button
            onClick={handleTransfer}
            disabled={saving}
            className="mt-6 w-full rounded-xl bg-violet-600 py-3 font-semibold hover:bg-violet-500"
          >
            {saving ? 'Transferindo...' : 'Transferir Sites'}
          </button>

        </div>

      </div>

    </div>
  );
}
