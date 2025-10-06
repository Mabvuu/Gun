
// frontend/src/Cfr/pages/cfrReceive.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react';

const rawBase = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
let API_BASE = String(rawBase).replace(/\/+$/,'');
API_BASE = API_BASE.replace(/\/api$/i,'');

export default function CfrReceive() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [officerId, setOfficerId] = useState('');
  const [cfrFile, setCfrFile] = useState(null);
  const [note, setNote] = useState('');

  const mountedRef = useRef(false);
  const buildUrl = () => `${API_BASE}/api/cfr/pending`;

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(buildUrl());
      if (!res.ok) throw new Error('failed to load');
      const data = await res.json();
      setApps(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('CFR load error', err);
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
      const res = await fetch(`${API_BASE}/api/cfr/${id}`);
      if (!res.ok) throw new Error('not found');
      const data = await res.json();
      setSelected(data);
      setOfficerId('');
      setCfrFile(null);
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
      if (cfrFile) form.append('cfrFile', cfrFile);

      const res = await fetch(`${API_BASE}/api/cfr/${id}/approve`, {
        method: 'POST',
        body: form
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({ error: 'fail' }));
        throw new Error(err.error || 'approve failed');
      }
      setMessage('Application approved at CFR stage.');
      await load();
      const refreshed = await (await fetch(`${API_BASE}/api/cfr/${id}`)).json().catch(()=>null);
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
      const res = await fetch(`${API_BASE}/api/cfr/${id}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ by: officerId || 'cfr_officer', reason: note || 'Declined at CFR stage' })
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({ error: 'fail' }));
        throw new Error(err.error || 'decline failed');
      }
      setMessage('Application declined at CFR stage.');
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
    <div className="space-y-4">
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-medium">Pending applications (CFR)</h3>
        {loading && <div className="text-sm text-gray-500 mt-2">Loading...</div>}
        {!loading && apps.length === 0 && <div className="text-sm text-gray-500 mt-3">No applications</div>}
        {apps.length > 0 && (
          <ul className="mt-3 space-y-2">
            {apps.map(a => (
              <li key={a.id} className="p-3 border rounded flex justify-between items-center">
                <div>
                  <div className="font-medium">ID {a.id} — Token: {a.token}</div>
                  <div className="text-sm text-gray-600">{a.province || '—'} / {a.town || '—'} — Dealer: {a.dealerName || '—'}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => viewApp(a.id)} className="px-2 py-1 bg-gray-200 rounded">View</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && (
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold">Application {selected.id}</h3>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <div className="text-sm"><strong>Applicant:</strong> {selected.applicantId}</div>
              <div className="text-sm"><strong>Dealer:</strong> {selected.dealerName}</div>
              <div className="text-sm"><strong>Province / Town:</strong> {selected.province} / {selected.town}</div>

              {selected.files?.file && <div className="text-sm mt-2"><a href={fileUrl(selected.files.file)} target="_blank" rel="noreferrer" className="text-blue-600">Open applicant file</a></div>}
              {selected.files?.endorsementFile && <div className="text-sm mt-2"><a href={fileUrl(selected.files.endorsementFile)} target="_blank" rel="noreferrer" className="text-blue-600">Open endorsement</a></div>}
              {selected.files?.certificateFile && <div className="text-sm mt-2"><a href={fileUrl(selected.files.certificateFile)} target="_blank" rel="noreferrer" className="text-blue-600">Open police certificate</a></div>}
              {selected.files?.licenseFile && <div className="text-sm mt-2"><a href={fileUrl(selected.files.licenseFile)} target="_blank" rel="noreferrer" className="text-blue-600">Open province license</a></div>}
              {selected.files?.finalFile && <div className="text-sm mt-2"><a href={fileUrl(selected.files.finalFile)} target="_blank" rel="noreferrer" className="text-blue-600">Open int final file</a></div>}
              {selected.files?.cfrFile && <div className="text-sm mt-2"><a href={fileUrl(selected.files.cfrFile)} target="_blank" rel="noreferrer" className="text-blue-600">Open CFR file</a></div>}

              <div className="mt-3">
                <label className="block text-sm">Notes / History</label>
                <div className="p-2 bg-gray-50 rounded mt-1">{selected.note || '—'}</div>
              </div>

              <div className="mt-3">
                <div className="text-sm">Received from int: {selected.receivedFromInt || '—'}</div>
                <div className="text-sm">Received at: {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '—'}</div>
              </div>
            </div>

            <div>
              <label className="block text-sm">Officer ID</label>
              <input value={officerId} onChange={e=>setOfficerId(e.target.value)} className="mt-1 input" placeholder="Officer identifier" />

              <label className="block text-sm mt-3">Upload CFR file (PDF)</label>
              <input type="file" accept="application/pdf" onChange={e=>setCfrFile(e.target.files[0])} className="mt-1" />

              <label className="block text-sm mt-3">Note / Reason</label>
              <textarea value={note} onChange={e=>setNote(e.target.value)} className="mt-1 textarea" />

              <div className="flex gap-2 mt-4">
                <button onClick={() => approve(selected.id)} disabled={actionLoading} className="px-3 py-2 bg-green-600 text-white rounded">Approve / Finalize</button>
                <button onClick={() => decline(selected.id)} disabled={actionLoading} className="px-3 py-2 bg-red-600 text-white rounded">Decline</button>
              </div>

              {message && <div className="mt-3 text-sm text-gray-700">{message}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

