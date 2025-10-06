// frontend/src/Int/pages/intRecieve.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react';

const rawBase = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
let API_BASE = String(rawBase).replace(/\/+$/,'');
API_BASE = API_BASE.replace(/\/api$/i,'');

export default function IntRecieve() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [officerId, setOfficerId] = useState('');
  const [finalFile, setFinalFile] = useState(null);
  const [note, setNote] = useState('');

  const mountedRef = useRef(false);
  const buildUrl = () => `${API_BASE}/api/int/pending`;

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(buildUrl());
      if (!res.ok) throw new Error('failed to load');
      const data = await res.json();
      setApps(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Int load error', err);
      setApps([]);
      setMessage('Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    load();
  }, [load]);

  useEffect(() => {
    function onStorage(e) {
      if (e.key === 'application_submitted_at') load();
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [load]);

  async function viewApp(id) {
    setSelected(null);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/int/${id}`);
      if (!res.ok) throw new Error('not found');
      const data = await res.json();
      setSelected(data);
      setOfficerId('');
      setFinalFile(null);
      setNote('');
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

  async function approve(id) {
    setActionLoading(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append('officerId', officerId || '');
      form.append('note', note || '');
      if (finalFile) form.append('finalFile', finalFile);

      const res = await fetch(`${API_BASE}/api/int/${id}/approve`, {
        method: 'POST',
        body: form
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({ error: 'fail' }));
        throw new Error(err.error || 'approve failed');
      }
      setMessage('Application approved at intermediate stage.');
      await load();
      const refreshed = await (await fetch(`${API_BASE}/api/int/${id}`)).json().catch(()=>null);
      setSelected(refreshed);
    } catch (err) {
      console.error(err);
      setMessage(err.message || 'approve failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function decline(id) {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/int/${id}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ by: officerId || 'int_officer', reason: note || 'Declined at int stage' })
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({ error: 'fail' }));
        throw new Error(err.error || 'decline failed');
      }
      setMessage('Application declined at intermediate stage.');
      await load();
      setSelected(null);
    } catch (err) {
      console.error(err);
      setMessage(err.message || 'decline failed');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6 p-6" style={{ background: 'linear-gradient(180deg,#06130f,#071a12)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(180deg,#0B3221,#135E3D)' }}>
              <div className="text-white font-bold">INT</div>
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-[#E6F7EE]">Intermediate — Pending Applications</h2>
              <div className="text-sm text-[#CFEFE0]">Review and decide – add notes and final files where required</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={load}
              className="px-3 py-2 rounded-md text-sm font-semibold"
              style={{ background: '#135E3D', color: '#04210D' }}
            >
              Refresh
            </button>
            <div className="text-xs text-[#9FBFAD]">Auto-updates on new submissions</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* applications list */}
          <div className="col-span-1 rounded-lg p-4" style={{ background: 'linear-gradient(180deg,#081A12,#0B3221)' }}>
            <h3 className="text-sm font-semibold text-[#CDEDD7] mb-3">Pending applications</h3>
            {loading && <div className="text-sm text-[#9FBFAD]">Loading...</div>}
            {!loading && apps.length === 0 && <div className="text-sm text-[#9FBFAD]">No applications</div>}
            {apps.length > 0 && (
              <ul className="space-y-2 max-h-[60vh] overflow-auto pr-2">
                {apps.map(a => (
                  <li
                    key={a.id}
                    onClick={() => viewApp(a.id)}
                    className={`cursor-pointer p-3 rounded-md border transition-colors ${
                      selected?.id === a.id ? 'border-[#1AA06D] bg-[rgba(26,160,109,0.06)]' : 'border-transparent hover:bg-[rgba(255,255,255,0.02)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-[#E6F7EE]">ID {a.id} — {a.token || '—'}</div>
                        <div className="text-xs text-[#9FBFAD] mt-1">{a.province || '—'} / {a.town || '—'}</div>
                      </div>
                      <div className="text-xs text-[#CDEDD7]">{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '—'}</div>
                    </div>
                    <div className="mt-2 text-xs text-[#BFDFCB]">Dealer: {a.dealerName || '—'}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* details & actions */}
          <div className="lg:col-span-2 rounded-lg p-4" style={{ background: 'linear-gradient(180deg,#09110D,#0D3A27)' }}>
            {!selected ? (
              <div className="p-8 rounded-md border border-[rgba(255,255,255,0.03)] text-center text-[#CDEDD7]">
                <div className="text-lg font-semibold text-[#E6F7EE]">Select an application to view details</div>
                <div className="text-sm mt-2">Click any item on the left to inspect files, notes and decide.</div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm text-[#CDEDD7]">Application</div>
                    <div className="text-xl font-bold text-[#E6F7EE]">#{selected.id} <span className="ml-2 text-xs px-2 py-1 rounded-full" style={{ background: selected.status === 'declined' ? '#7f1d1d' : '#1AA06D', color: '#04210D' }}>{selected.status || 'pending'}</span></div>
                    <div className="text-sm text-[#9FBFAD] mt-1">Submitted: {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '—'}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-[#CDEDD7]">Applicant</div>
                    <div className="text-sm font-medium text-[#E6F7EE]">{selected.applicantId || '—'}</div>
                    <div className="text-xs text-[#9FBFAD] mt-1">Received from: {selected.receivedFromProvince || '—'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <div className="text-sm text-[#CDEDD7]">Files</div>
                    <div className="flex flex-col gap-2">
                      {selected.files?.file && <a className="text-sm px-3 py-2 rounded-md" style={{ background: 'rgba(255,255,255,0.02)', color: '#CFEFE0' }} href={fileUrl(selected.files.file)} target="_blank" rel="noreferrer">Applicant file</a>}
                      {selected.files?.endorsementFile && <a className="text-sm px-3 py-2 rounded-md" style={{ background: 'rgba(255,255,255,0.02)', color: '#CFEFE0' }} href={fileUrl(selected.files.endorsementFile)} target="_blank" rel="noreferrer">Endorsement</a>}
                      {selected.files?.certificateFile && <a className="text-sm px-3 py-2 rounded-md" style={{ background: 'rgba(255,255,255,0.02)', color: '#CFEFE0' }} href={fileUrl(selected.files.certificateFile)} target="_blank" rel="noreferrer">Police certificate</a>}
                      {selected.files?.licenseFile && <a className="text-sm px-3 py-2 rounded-md" style={{ background: 'rgba(255,255,255,0.02)', color: '#CFEFE0' }} href={fileUrl(selected.files.licenseFile)} target="_blank" rel="noreferrer">Province license</a>}
                      {selected.files?.finalFile && <a className="text-sm px-3 py-2 rounded-md" style={{ background: 'rgba(255,255,255,0.02)', color: '#CFEFE0' }} href={fileUrl(selected.files.finalFile)} target="_blank" rel="noreferrer">INT final file</a>}
                      {!selected.files && <div className="text-sm text-[#9FBFAD]">No files attached</div>}
                    </div>

                    <div className="mt-3">
                      <div className="text-sm text-[#CDEDD7]">Notes / History</div>
                      <div className="mt-1 p-3 rounded-md" style={{ background: 'rgba(255,255,255,0.02)', color: '#BFDFCB' }}>
                        {selected.note || '—'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs text-[#CDEDD7]">Officer ID</label>
                    <input
                      value={officerId}
                      onChange={e=>setOfficerId(e.target.value)}
                      className="w-full px-3 py-2 rounded-md bg-[rgba(255,255,255,0.02)] border border-transparent focus:border-[#1AA06D] outline-none"
                      placeholder="Officer identifier"
                    />

                    <label className="block text-xs text-[#CDEDD7]">Upload final file (PDF)</label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={e=>setFinalFile(e.target.files[0])}
                      className="w-full text-sm text-[#CDEDD7]"
                    />

                    <label className="block text-xs text-[#CDEDD7] mt-2">Note / Reason</label>
                    <textarea
                      value={note}
                      onChange={e=>setNote(e.target.value)}
                      className="w-full px-3 py-2 rounded-md bg-[rgba(255,255,255,0.02)] border border-transparent focus:border-[#1AA06D] outline-none"
                      placeholder="Short note or reason..."
                      rows={6}
                    />

                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => approve(selected.id)}
                        disabled={actionLoading}
                        className="flex-1 px-3 py-2 rounded-md text-sm font-semibold"
                        style={{ background: '#1AA06D', color: '#04210D' }}
                      >
                        {actionLoading ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => decline(selected.id)}
                        disabled={actionLoading}
                        className="flex-1 px-3 py-2 rounded-md text-sm font-semibold"
                        style={{ background: '#9b1e1e', color: '#fff' }}
                      >
                        {actionLoading ? 'Processing...' : 'Decline'}
                      </button>
                    </div>

                    {message && <div className="text-sm text-[#CDEDD7] mt-2">{message}</div>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-xs text-[#9FBFAD] max-w-6xl mx-auto">
          Tip: Review attachments and notes carefully. Use concise factual language when adding your note.
        </div>
      </div>
    </div>
  );
}
