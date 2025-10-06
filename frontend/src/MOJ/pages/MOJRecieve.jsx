// frontend/src/MOJ/pages/MOJRecieve.jsx
import React, { useEffect, useState, useCallback } from 'react';

const rawBase = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
let API_BASE = String(rawBase).replace(/\/+$/,'');
API_BASE = API_BASE.replace(/\/api$/i,''); // tolerate either form

// Palette — keep consistent with MOJ dashboard
const COLORS = {
  veryLight: '#EEF2F0',
  gray: '#858585',
  mint: '#63DBD5',
  teal: '#15696F',
  dark: '#282828',
};

// Zimbabwe provinces + sample towns (not exhaustive)
const PROVINCES = {
  'Harare': ['Harare', 'Chitungwiza', 'Mutare? (note: Mutare is in Manicaland)'],
  'Bulawayo': ['Bulawayo'],
  'Manicaland': ['Mutare', 'Buhera', 'Penhalonga'],
  'Mashonaland Central': ['Bindura', 'Mt Darwin', 'Mazowe'],
  'Mashonaland East': ['Marondera', 'Chivhu', 'Wedza'],
  'Mashonaland West': ['Chegutu', 'Kadoma', 'Chinhoyi'],
  'Masvingo': ['Masvingo', 'Chiredzi', 'Mwenezi'],
  'Matabeleland North': ['Hwange', 'Binga', 'Lupane'],
  'Matabeleland South': ['Gwanda', 'Beitbridge', 'Filabusi'],
  'Midlands': ['Gweru', 'Kwekwe', 'Zvishavane']
};

// Six imaginary gun clubs (simple objects with emoji icons)
const CLUBS = [
  { id: 'club-1', name: 'Highveld Marksmen Club', icon: '🎯' },
  { id: 'club-2', name: 'Zambezi Shooters Guild', icon: '🏹' },
  { id: 'club-3', name: 'Savanna Precision Association', icon: '🔫' },
  { id: 'club-4', name: 'Great Zimbabwe Rifles', icon: '🛡️' },
  { id: 'club-5', name: 'Kariba Range Club', icon: '⛰️' },
  { id: 'club-6', name: 'Lakeside Tactical Club', icon: '⚙️' }
];

export default function MojReceive() {
  const [province, setProvince] = useState('');
  const [town, setTown] = useState('');
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState('info'); // 'info' | 'success' | 'error'

  // action state
  const [flagReason, setFlagReason] = useState('');
  const [forwardNote, setForwardNote] = useState('');
  const [selectedClub, setSelectedClub] = useState(CLUBS[0].id);
  const [actionLoading, setActionLoading] = useState(false);

  const buildUrl = (p, t) => {
    const q = new URLSearchParams();
    if (p) q.set('province', p);
    if (t) q.set('town', t);
    return `${API_BASE}/api/moj/pending?${q.toString()}`;
  };

  const load = useCallback(async (opts = {}) => {
    setLoading(true);
    setMessage(null);
    try {
      const p = opts.province ?? province;
      const t = opts.town ?? town;
      const url = buildUrl(p, t);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`failed to load (${res.status})`);
      const data = await res.json();
      setApps(Array.isArray(data) ? data : []);
      if ((Array.isArray(data) ? data.length : 0) === 0) {
        setMessage('No applications found for the selected filters.');
        setMessageType('info');
      }
    } catch (err) {
      console.error('MOJ load error', err);
      setApps([]);
      setMessage('Failed to load applications');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }, [province, town]);

  useEffect(() => { load(); }, [load]);

  // refresh when dealer submits (cross-tab or same-tab)
  useEffect(() => {
    function onStorage(e) {
      if (e.key === 'application_submitted_at') load();
    }
    window.addEventListener('storage', onStorage);
    if (localStorage.getItem('application_submitted_at')) load();
    return () => window.removeEventListener('storage', onStorage);
  }, [load]);

  async function viewApp(id) {
    setSelected(null);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/moj/${id}`);
      if (!res.ok) throw new Error('not found');
      const data = await res.json();
      setSelected(data);

      // prefill action controls from app (safe defaults)
      setFlagReason('');
      setForwardNote('');
      setSelectedClub(CLUBS[0].id);
    } catch (err) {
      console.error(err);
      setMessage('Could not load application');
      setMessageType('error');
    }
  }

  function fileUrl(file) {
    if (!file) return null;
    const p = file.path || file;
    if (String(p).startsWith('http')) return p;
    return `${API_BASE}${p.startsWith('/') ? '' : '/'}${p}`;
  }

  // Flag application (sends to backend)
  async function flagApp(id) {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/moj/${id}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: flagReason || 'Flagged by MOJ', by: 'MOJ_USER' })
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({ error: 'fail' }));
        throw new Error(err.error || 'flag failed');
      }
      setMessage('Application flagged. Dealer will be notified.');
      setMessageType('success');
      await load();
      const refreshed = await fetchAndReturn(id);
      setSelected(refreshed);
    } catch (err) {
      console.error(err);
      setMessage(err.message || 'flag failed');
      setMessageType('error');
    } finally {
      setActionLoading(false);
    }
  }

  // Forward application to Club (includes club selection and province/town)
  async function forwardApp(id) {
    setActionLoading(true);
    setMessage(null);
    try {
      // include chosen club, province, town and note
      const payload = {
        by: 'MOJ_USER',
        note: forwardNote || '',
        club: selectedClub,
        province: selected?.province || province,
        town: selected?.town || town,
        override: false
      };

      const res = await fetch(`${API_BASE}/api/moj/${id}/forward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({ error: 'fail' }));
        throw new Error(err.error || 'forward failed');
      }
      setMessage(`Forwarded to club (${CLUBS.find(c=>c.id===selectedClub)?.name || selectedClub}).`);
      setMessageType('success');
      await load();
      const refreshed = await fetchAndReturn(id);
      setSelected(refreshed);
    } catch (err) {
      console.error(err);
      setMessage(err.message || 'forward failed');
      setMessageType('error');
    } finally {
      setActionLoading(false);
    }
  }

  async function fetchAndReturn(id) {
    try {
      const res = await fetch(`${API_BASE}/api/moj/${id}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  // Province -> town select helper
  const provinceOptions = Object.keys(PROVINCES);
  const townsForSelectedProvince = province ? PROVINCES[province] : [];

  return (
    <div className="space-y-4">
      {/* Header / Filters */}
      <div
        className="rounded-lg p-4 shadow-sm"
        style={{
          background: `linear-gradient(90deg, rgba(255,255,255,0.9), ${COLORS.mint}10)`,
          border: `1px solid ${COLORS.veryLight}`,
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="font-semibold text-lg" style={{ color: COLORS.dark }}>
              MOJ — Receive &amp; Process
            </h2>
            <p className="text-sm mt-1" style={{ color: COLORS.gray }}>
              Filter and inspect incoming applications. Use the actions to flag or forward to clubs.
            </p>
          </div>

          <div className="w-full md:w-auto md:flex items-center gap-3">
            <div className="flex gap-2 items-end">
              <div>
                <label className="text-xs block mb-1" style={{ color: COLORS.gray }}>Province</label>
                <select
                  value={province}
                  onChange={e => { setProvince(e.target.value); setTown(''); }}
                  className="mt-1 rounded border px-2 py-1"
                  style={{ borderColor: `${COLORS.veryLight}`, minWidth: 180 }}
                >
                  <option value="">— All provinces —</option>
                  {provinceOptions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs block mb-1" style={{ color: COLORS.gray }}>Town</label>
                <select
                  value={town}
                  onChange={e => setTown(e.target.value)}
                  className="mt-1 rounded border px-2 py-1"
                  style={{ borderColor: `${COLORS.veryLight}`, minWidth: 180 }}
                >
                  <option value="">— All towns —</option>
                  {townsForSelectedProvince.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-2 md:mt-0">
              <button
                onClick={() => load({ province, town })}
                className="px-3 py-2 rounded"
                style={{ background: COLORS.mint, color: COLORS.dark }}
              >
                {loading ? 'Loading…' : 'Filter'}
              </button>

              <button
                onClick={() => { setProvince(''); setTown(''); load({ province: '', town: '' }); }}
                className="px-3 py-2 rounded"
                style={{ background: 'transparent', border: `1px solid ${COLORS.veryLight}`, color: COLORS.dark }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Message / Alert */}
      {message && (
        <div
          className="rounded p-3"
          style={{
            background:
              messageType === 'success' ? `linear-gradient(90deg, ${COLORS.mint}20, ${COLORS.mint}10)`
              : messageType === 'error' ? 'rgba(255,230,230,0.9)'
              : 'rgba(240,248,247,0.95)',
            border: `1px solid ${messageType === 'error' ? 'rgba(255,120,120,0.25)' : COLORS.veryLight}`,
            color: messageType === 'error' ? '#661212' : COLORS.dark
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm">{message}</div>
            <button
              onClick={() => setMessage(null)}
              className="text-xs px-2 py-1 rounded"
              style={{ border: `1px solid ${COLORS.veryLight}`, background: 'transparent', color: COLORS.gray }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Pending list */}
      <div
        className="rounded-lg p-4 shadow-sm"
        style={{ background: 'white', border: `1px solid ${COLORS.veryLight}` }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-medium" style={{ color: COLORS.dark }}>
            Pending applications {loading && <span className="text-sm" style={{ color: COLORS.gray }}> (loading...)</span>}
          </h3>

          <div className="text-sm" style={{ color: COLORS.gray }}>
            {apps.length} item{apps.length !== 1 ? 's' : ''}
          </div>
        </div>

        {!loading && apps.length === 0 && <div className="text-sm text-gray-500 mt-3">No applications</div>}

        {apps.length > 0 && (
          <ul className="mt-3 space-y-2">
            {apps.map(a => (
              <li
                key={a.id}
                className="p-3 border rounded flex justify-between items-center hover:shadow"
                style={{ borderColor: `${COLORS.veryLight}` }}
              >
                <div>
                  <div className="font-medium" style={{ color: COLORS.dark }}>
                    ID {a.id} — <span className="text-xs" style={{ color: COLORS.gray }}>Token: {a.token}</span>
                  </div>
                  <div className="text-sm" style={{ color: COLORS.gray }}>
                    {a.province || '—'} / {a.town || '—'} — Dealer: {a.dealerName || '—'}
                  </div>
                </div>

                <div className="flex gap-2 items-center">
                  <span className="text-xs px-2 py-1 rounded" style={{ background: '#f3f7f6', color: COLORS.gray }}>
                    {a.flagged ? 'Flagged' : 'New'}
                  </span>
                  <button
                    onClick={() => viewApp(a.id)}
                    className="px-2 py-1 rounded text-sm"
                    style={{ background: 'transparent', border: `1px solid ${COLORS.veryLight}`, color: COLORS.dark }}
                  >
                    View
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Selected application / actions */}
      {selected && (
        <div className="rounded-lg p-4 shadow-sm" style={{ background: 'white', border: `1px solid ${COLORS.veryLight}` }}>
          <div className="flex items-start justify-between gap-4">
            <div style={{ flex: 1 }}>
              <h3 className="font-semibold" style={{ color: COLORS.dark }}>Application {selected.id}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <div className="text-sm" style={{ color: COLORS.gray }}><strong>Token:</strong> {selected.token}</div>
                  <div className="text-sm" style={{ color: COLORS.gray }}><strong>Dealer:</strong> {selected.dealerName}</div>
                  <div className="text-sm" style={{ color: COLORS.gray }}><strong>Applicant:</strong> {selected.applicantId}</div>
                  <div className="text-sm" style={{ color: COLORS.gray }}><strong>Province / Town:</strong> {selected.province} / {selected.town}</div>
                  <div className="text-sm" style={{ color: COLORS.gray }}><strong>Flagged:</strong> {selected.flagged ? 'Yes' : 'No'}</div>

                  {selected.file && (
                    <div className="text-sm mt-2">
                      <a href={fileUrl(selected.file)} target="_blank" rel="noreferrer" className="text-sm" style={{ color: COLORS.teal }}>Open file</a>
                    </div>
                  )}

                  <div className="mt-3">
                    <label className="block text-sm" style={{ color: COLORS.gray }}>Note (applicant / dealer)</label>
                    <div className="p-2 bg-gray-50 rounded mt-1" style={{ color: COLORS.dark }}>{selected.note || '—'}</div>
                  </div>
                </div>

                <div>
                  <div className="text-sm mb-2 font-medium" style={{ color: COLORS.dark }}>Actions</div>

                  {/* Flag area */}
                  <div className="mb-4 p-3 rounded" style={{ background: `${COLORS.mint}10`, border: `1px solid ${COLORS.veryLight}` }}>
                    <label className="block text-sm" style={{ color: COLORS.gray }}>Flag reason</label>
                    <textarea
                      value={flagReason}
                      onChange={e => setFlagReason(e.target.value)}
                      className="mt-1 w-full rounded border p-2"
                      rows={3}
                      placeholder="Explain why this application is flagged"
                      style={{ borderColor: COLORS.veryLight }}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => flagApp(selected.id)}
                        disabled={actionLoading}
                        className="px-3 py-2 rounded"
                        style={{ background: '#ff6b6b', color: 'white' }}
                      >
                        {actionLoading ? 'Working…' : 'Flag'}
                      </button>
                    </div>
                  </div>

                  {/* Forward area */}
                  <div className="mb-4 p-3 rounded" style={{ background: `${COLORS.teal}08`, border: `1px solid ${COLORS.veryLight}` }}>
                    <label className="block text-sm mb-2" style={{ color: COLORS.gray }}>Forward to club</label>

                    <div className="grid gap-2">
                      {CLUBS.map(c => (
                        <label
                          key={c.id}
                          className={`flex items-center gap-3 p-2 rounded cursor-pointer`}
                          style={{
                            border: selectedClub === c.id ? `1px solid ${COLORS.mint}` : `1px solid rgba(0,0,0,0.04)`,
                            background: selectedClub === c.id ? `${COLORS.mint}20` : 'transparent'
                          }}
                        >
                          <input type="radio" name="club" checked={selectedClub === c.id} onChange={() => setSelectedClub(c.id)} />
                          <span className="text-lg">{c.icon}</span>
                          <span className="text-sm" style={{ color: COLORS.dark }}>{c.name}</span>
                        </label>
                      ))}
                    </div>

                    <div className="mt-3">
                      <label className="block text-sm" style={{ color: COLORS.gray }}>Confirm province / town for routing</label>
                      <div className="flex gap-2 mt-1">
                        <select
                          value={province || selected.province || ''}
                          onChange={e => setProvince(e.target.value)}
                          className="rounded border px-2 py-1"
                          style={{ borderColor: `${COLORS.veryLight}`, minWidth: 140 }}
                        >
                          <option value="">— Select province —</option>
                          {Object.keys(PROVINCES).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>

                        <select
                          value={town || selected.town || ''}
                          onChange={e => setTown(e.target.value)}
                          className="rounded border px-2 py-1"
                          style={{ borderColor: `${COLORS.veryLight}`, minWidth: 140 }}
                        >
                          <option value="">— Select town —</option>
                          {(PROVINCES[province] || []).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="block text-sm" style={{ color: COLORS.gray }}>Forward note / endorsement</label>
                      <textarea
                        value={forwardNote}
                        onChange={e => setForwardNote(e.target.value)}
                        className="mt-1 w-full rounded border p-2"
                        rows={3}
                        placeholder="Add any notes or endorsement details"
                        style={{ borderColor: COLORS.veryLight }}
                      />
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => forwardApp(selected.id)}
                        disabled={actionLoading}
                        className="px-3 py-2 rounded"
                        style={{ background: '#22c55e', color: 'white' }}
                      >
                        {actionLoading ? 'Working…' : 'Forward to Club'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {message && <div className="mt-3 text-sm" style={{ color: COLORS.gray }}>{message}</div>}
        </div>
      )}
    </div>
  );
}
