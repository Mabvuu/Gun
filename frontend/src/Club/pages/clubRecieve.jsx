// frontend/src/Club/pages/ClubReceive.jsx
import React, { useEffect, useState, useCallback } from 'react';

const rawBase = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
let API_BASE = String(rawBase).replace(/\/+$/,'');
API_BASE = API_BASE.replace(/\/api$/i,'');

const CLUBS = [
  { id: 'club-1', name: 'Highveld Marksmen Club', icon: '🎯' },
  { id: 'club-2', name: 'Zambezi Shooters Guild', icon: '🏹' },
  { id: 'club-3', name: 'Savanna Precision Association', icon: '🔫' },
  { id: 'club-4', name: 'Great Zimbabwe Rifles', icon: '🛡️' },
  { id: 'club-5', name: 'Kariba Range Club', icon: '⛰️' },
  { id: 'club-6', name: 'Lakeside Tactical Club', icon: '⚙️' }
];

const COLORS = {
  gold: '#DAA112',
  sage: '#809276',
  olive: '#666E51',
  deepTeal: '#10383A',
  slate: '#768886',
  subtle: 'rgba(16,56,58,0.04)'
};

/* Simulation sample application (visible by default) */
const SAMPLE_APP = {
  id: 'sim-0001',
  token: 'SIM-2025-XYZ',
  dealerName: 'Demo Arms & Co.',
  province: 'Sim Province',
  town: 'Example Town',
  file: 'https://example.com/sample-application.pdf',
  createdAt: new Date().toLocaleString(),
  note: 'This is a simulated application to preview the Club Receive UI. Fields are fake.',
  applicantId: 'SIM-APPLICANT-01'
};

export default function ClubReceive() {
  const [clubId, setClubId] = useState(CLUBS[0].id);
  const [showSimulation, setShowSimulation] = useState(true);
  const [apps, setApps] = useState(() => (showSimulation ? [SAMPLE_APP] : []));
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(() => (showSimulation ? SAMPLE_APP : null));
  const [hours, setHours] = useState('');
  const [isMember, setIsMember] = useState(true);
  const [endorsementFile, setEndorsementFile] = useState(null);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const buildUrl = (c) => `${API_BASE}/api/club/pending?clubId=${encodeURIComponent(c || '')}`;

  const load = useCallback(async (opts = {}) => {
    setLoading(true);
    setMessage(null);
    try {
      const id = opts.clubId ?? clubId;
      const res = await fetch(buildUrl(id));
      if (!res.ok) throw new Error('failed to load');
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      if (showSimulation) {
        const withoutSim = arr.filter(a => a && a.id !== SAMPLE_APP.id);
        setApps([SAMPLE_APP, ...withoutSim]);
      } else {
        setApps(arr);
      }
    } catch (err) {
      console.error('Club load error', err);
      // keep simulation if visible, otherwise clear
      setApps(showSimulation ? [SAMPLE_APP] : []);
      setMessage('Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [clubId, showSimulation]);

  useEffect(() => { load(); }, [load]);

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

    // Local lookup first (handles simulation and already-loaded apps)
    const local = apps.find(a => a && a.id === id);
    if (local) {
      setSelected(local);
      setHours('');
      setIsMember(true);
      setEndorsementFile(null);
      setNote('');
      setTimeout(()=> {
        const el = document.getElementById('club-receive-details');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/club/${id}`);
      if (!res.ok) throw new Error('not found');
      const data = await res.json();
      setSelected(data);
      setHours('');
      setIsMember(true);
      setEndorsementFile(null);
      setNote('');
      setTimeout(()=> {
        const el = document.getElementById('club-receive-details');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    } catch (err) {
      console.error(err);
      setMessage('Could not load application');
    }
  }

  function fileUrl(file) {
    if (!file) return null;
    const p = file.path || file;
    if (String(p).startsWith('http')) return p;
    return `${API_BASE}${p.startsWith('/') ? '' : '/'}${p}`;
  }

  async function submitEndorsement(id) {
    setActionLoading(true);
    setMessage(null);
    try {
      // If it's a simulated app (id starts with "sim-"), just simulate success
      if (String(id).startsWith('sim-')) {
        setTimeout(() => {
          setMessage('✅ (Simulation) Endorsement attached and forwarded to Police.');
          setActionLoading(false);
          setSelected(prev => prev ? { ...prev, endorsed: true } : prev);
        }, 700);
        return;
      }

      const form = new FormData();
      form.append('endorsedBy', clubId);
      form.append('hoursPracticed', hours);
      form.append('isMember', isMember ? 'true' : 'false');
      form.append('note', note || '');
      if (endorsementFile) form.append('endorsementFile', endorsementFile);

      const res = await fetch(`${API_BASE}/api/club/${id}/endorse`, {
        method: 'POST',
        body: form
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({ error: 'fail' }));
        throw new Error(err.error || 'endorse failed');
      }
      setMessage('✅ Endorsement attached and forwarded to Police.');
      await load();
      const refreshed = await (await fetch(`${API_BASE}/api/club/${id}`)).json().catch(()=>null);
      setSelected(refreshed);
    } catch (err) {
      console.error(err);
      setMessage(err.message || 'endorse failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function decline(id) {
    setActionLoading(true);
    setMessage(null);
    try {
      // Simulate decline for local simulated apps
      if (String(id).startsWith('sim-')) {
        setTimeout(() => {
          setMessage('❌ (Simulation) Application declined.');
          setApps(prev => prev.filter(a => a.id !== id));
          if (selected?.id === id) setSelected(null);
          setActionLoading(false);
        }, 600);
        return;
      }

      const res = await fetch(`${API_BASE}/api/club/${id}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ by: clubId, reason: note || 'Declined by club' })
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({ error: 'fail' }));
        throw new Error(err.error || 'decline failed');
      }
      setMessage('❌ Application declined.');
      await load();
      setSelected(null);
    } catch (err) {
      console.error(err);
      setMessage(err.message || 'decline failed');
    } finally {
      setActionLoading(false);
    }
  }

  /* Toggle simulation visibility (simulation starts visible) */
  function toggleSimulation() {
    setShowSimulation(prev => {
      const next = !prev;
      if (next) {
        // show simulation: add to front and select it
        setApps(prevApps => {
          const without = (prevApps || []).filter(a => a && a.id !== SAMPLE_APP.id);
          return [SAMPLE_APP, ...without];
        });
        setSelected(SAMPLE_APP);
        setMessage('Simulation example visible');
      } else {
        // hide simulation: remove it and clear selection if it was selected
        setApps(prevApps => (prevApps || []).filter(a => a && a.id !== SAMPLE_APP.id));
        setSelected(prev => (prev && prev.id === SAMPLE_APP.id ? null : prev));
        setMessage('Simulation example hidden');
      }
      return next;
    });
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4">
      {/* Top controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <label className="text-sm font-semibold">Club</label>
          <select
            value={clubId}
            onChange={e => setClubId(e.target.value)}
            className="mt-1 px-3 py-2 rounded-md"
            style={{ border: `1px solid ${COLORS.slate}`, minWidth: 220 }}
            aria-label="Select club"
          >
            {CLUBS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="ml-auto flex gap-3">
          <button
            onClick={() => load({ clubId })}
            className="px-4 py-2 rounded-md font-semibold shadow"
            style={{ background: COLORS.deepTeal, color: 'white' }}
          >
            Reload
          </button>

          <button
            onClick={() => { setSelected(null); setApps(showSimulation ? [SAMPLE_APP] : []); }}
            className="px-4 py-2 rounded-md font-medium"
            style={{ background: COLORS.slate, color: 'white' }}
            title="Clear selection & list"
          >
            Clear
          </button>

          <button
            onClick={toggleSimulation}
            className="px-4 py-2 rounded-md font-medium"
            title={showSimulation ? 'Hide the example simulation' : 'Show the example simulation'}
            style={{ background: showSimulation ? COLORS.olive : COLORS.sage, color: 'white' }}
          >
            {showSimulation ? 'Hide example' : 'Show example'}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="rounded-md p-3 text-sm" style={{ background: COLORS.subtle }}>
          {message}
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left: list */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Pending applications</h3>
              <div className="text-sm text-[rgba(0,0,0,0.6)]">
                {loading ? 'Loading…' : `${apps.length} total`}
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-14 rounded-md bg-[rgba(0,0,0,0.04)] animate-pulse" />
                ))}
              </div>
            ) : apps.length === 0 ? (
              <div className="py-8 text-center text-sm text-[rgba(0,0,0,0.6)]">No pending applications for this club.</div>
            ) : (
              <ul className="space-y-3 max-h-[68vh] overflow-auto pr-1">
                {apps.map(a => (
                  <li
                    key={a.id}
                    onClick={() => viewApp(a.id)}
                    role="button"
                    aria-pressed={selected?.id === a.id}
                    className={`group flex items-center gap-3 p-3 rounded-lg transition transform ${
                      selected?.id === a.id ? 'ring-2 ring-offset-1' : 'hover:shadow-md hover:-translate-y-0.5'
                    }`}
                    style={{
                      border: `1px solid ${selected?.id === a.id ? COLORS.gold : 'transparent'}`,
                      background: selected?.id === a.id ? 'rgba(218,161,18,0.06)' : 'white'
                    }}
                  >
                    <div
                      className="flex items-center justify-center flex-shrink-0"
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 12,
                        background: COLORS.subtle,
                        fontSize: 22,
                        lineHeight: '56px'
                      }}
                      aria-hidden
                    >
                      {a.token ? (String(a.token).slice(0,1).toUpperCase()) : '📄'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-medium truncate">#{a.id} — {a.token}</div>
                        <div className="text-xs text-[rgba(0,0,0,0.45)]">• {a.dealerName || 'Unknown dealer'}</div>
                      </div>
                      <div className="text-sm text-[rgba(0,0,0,0.55)] mt-1 truncate">
                        {a.province || '—'} / {a.town || '—'}
                      </div>
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); viewApp(a.id); }}
                        className="px-3 py-1 rounded-md text-sm font-semibold"
                        style={{ background: COLORS.sage, color: 'white' }}
                        aria-label={`View ${a.id}`}
                      >
                        View
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right: details */}
        <div className="lg:col-span-2">
          <div id="club-receive-details" className="bg-white rounded-lg shadow p-5 min-h-[220px]">
            {!selected ? (
              <div className="flex flex-col items-center justify-center text-center py-12 text-[rgba(0,0,0,0.6)]">
                <div style={{ fontSize: 54 }}>📄</div>
                <div className="mt-4 text-lg font-semibold">Select an application to view details</div>
                <div className="text-sm mt-2">Tip: click an item on the left for full details and actions.</div>
              </div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-semibold">Application {selected.id}</h3>
                    <div className="text-sm text-[rgba(0,0,0,0.6)] mt-1">
                      Applicant: <span className="font-medium">{selected.applicantId || '—'}</span>
                      <span className="mx-2">•</span>
                      Dealer: <span className="font-medium">{selected.dealerName || '—'}</span>
                    </div>
                    <div className="text-sm text-[rgba(0,0,0,0.6)] mt-1">{selected.province || '—'} / {selected.town || '—'}</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <a
                      href={fileUrl(selected.file)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-md font-semibold"
                      style={{ background: COLORS.deepTeal, color: 'white' }}
                    >
                      Open file
                    </a>

                    <button
                      onClick={() => setSelected(null)}
                      className="px-3 py-2 rounded-md"
                      style={{ background: COLORS.slate, color: 'white' }}
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="mb-4">
                      <label className="block text-sm font-semibold mb-1">Note</label>
                      <div className="p-3 rounded-md" style={{ background: COLORS.subtle }}>
                        <div className="text-sm text-[rgba(0,0,0,0.7)]">{selected.note || '—'}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Stat label="Submitted" value={selected.createdAt || selected.submittedAt || '—'} />
                      <Stat label="Token" value={selected.token || '—'} />
                      <Stat label="Province" value={selected.province || '—'} />
                      <Stat label="Town" value={selected.town || '—'} />
                    </div>
                  </div>

                  <div>
                    <div className="mb-3">
                      <label className="block text-sm font-semibold">Endorsement</label>
                      <input
                        value={hours}
                        onChange={e=>setHours(e.target.value)}
                        placeholder="Hours practiced (e.g. 20)"
                        className="mt-2 px-3 py-2 rounded-md w-full"
                        style={{ border: `1px solid ${COLORS.slate}` }}
                        inputMode="numeric"
                      />
                    </div>

                    <div className="mb-3 flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={isMember} onChange={e=>setIsMember(e.target.checked)} className="h-4 w-4" />
                        <span className="text-sm">Applicant is a club member</span>
                      </label>
                    </div>

                    <div className="mb-3">
                      <label className="block text-sm font-semibold mb-1">Upload endorsement (PDF)</label>
                      <input type="file" accept="application/pdf" onChange={e=>setEndorsementFile(e.target.files[0])} />
                      {endorsementFile && <div className="mt-2 text-sm text-[rgba(0,0,0,0.6)]">Selected: {endorsementFile.name}</div>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-1">Note / Reason</label>
                      <textarea
                        value={note}
                        onChange={e=>setNote(e.target.value)}
                        className="mt-1 px-3 py-2 rounded-md w-full"
                        rows={4}
                        style={{ border: `1px solid ${COLORS.slate}` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => submitEndorsement(selected.id)}
                    disabled={actionLoading}
                    className="px-5 py-2 rounded-md font-semibold shadow"
                    style={{
                      background: COLORS.gold,
                      color: '#000',
                      boxShadow: '0 10px 30px rgba(218,161,18,0.14)'
                    }}
                  >
                    {actionLoading ? 'Processing…' : 'Attach & Forward to Police'}
                  </button>

                  <button
                    onClick={() => decline(selected.id)}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-md font-semibold"
                    style={{ background: COLORS.olive, color: 'white' }}
                  >
                    {actionLoading ? 'Processing…' : 'Decline'}
                  </button>

                  <button
                    onClick={() => { setHours(''); setIsMember(true); setEndorsementFile(null); setNote(''); }}
                    className="px-3 py-2 rounded-md"
                    style={{ background: '#f3f4f6' }}
                  >
                    Reset
                  </button>

                  {message && <div className="ml-3 text-sm text-[rgba(0,0,0,0.7)]">{message}</div>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Small shared UI pieces */

function Stat({ label, value }) {
  return (
    <div className="p-2">
      <div className="text-xs text-[rgba(0,0,0,0.55)]">{label}</div>
      <div className="font-medium mt-1">{value}</div>
    </div>
  );
}
