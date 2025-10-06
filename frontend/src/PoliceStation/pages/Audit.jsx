// frontend/src/Police/pages/Audit.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

function formatDateTime(iso) {
  try { return new Date(iso).toLocaleString(); } catch { return iso || '—'; }
}

function makeSimulatedAudit(count = 50) {
  const users = ['Inspector Nyathi','Inspector Moyo','Inspector Dube','Inspector Ndlovu','Sgt. Chirwa','Const. Banda'];
  const actions = ['Inspection completed','Signature captured','Document verified','Follow-up completed'];
  const results = ['Successful','Declined'];
  const items = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const minutesAgo = Math.floor(Math.random() * 60 * 24 * 45);
    const ts = new Date(now - minutesAgo * 60 * 1000).toISOString();
    const user = users[i % users.length];
    const action = actions[i % actions.length];
    const result = Math.random() < 0.7 ? results[0] : results[1];
    const appId = `A-${1000 + Math.floor(Math.random() * 9000)}`;
    items.push({
      id: `sim-${i + 1}`,
      timestamp: ts,
      user,
      action,
      result,
      details: `${action} — Application ${appId}`
    });
  }
  return items;
}

export default function Audit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const SIMULATED_AUDIT = useMemo(() => makeSimulatedAudit(50), []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/police/audit');
        if (mounted && res && Array.isArray(res.data) && res.data.length) {
          setLogs(res.data);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.debug('audit: server load failed', err);
      }

      try {
        const raw = localStorage.getItem('audit_snapshot');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (mounted && Array.isArray(parsed) && parsed.length) {
            setLogs(parsed);
            setLoading(false);
            return;
          }
        }
      } catch (lsErr) {
        console.debug('audit: local snapshot read failed', lsErr);
      }

      if (mounted) {
        setLogs(SIMULATED_AUDIT);
      }
      setLoading(false);
    };

    load();
    return () => { mounted = false; };
  }, [SIMULATED_AUDIT]);

  const successfulLogs = logs.filter(l => l && l.result && /success/i.test(l.result));

  function exportCSV() {
    if (!successfulLogs || successfulLogs.length === 0) {
      setMessage('Nothing to export.');
      setTimeout(() => setMessage(''), 2000);
      return;
    }
    const header = ['id', 'timestamp', 'user', 'action', 'result', 'details'];
    const rows = successfulLogs.map(r => [
      r.id ?? '',
      r.timestamp ?? '',
      r.user ?? '',
      r.action ?? '',
      r.result ?? '',
      (r.details || '').replace(/\n/g, ' ').replace(/"/g, '""')
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c)}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_successful_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setMessage(`Exported ${rows.length} item(s).`);
    setTimeout(() => setMessage(''), 2500);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09110D] text-[#E8F8F5] p-6">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-lg bg-[#0e1a14] px-4 py-6 shadow-md inline-block">Loading audit...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09110D] text-[#E8F8F5] p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-4">
          <h1 className="text-[#E8F8F5] text-lg font-medium">Audit — Successful Inspections & Sign Events</h1>

          <div className="flex items-center gap-3">
            <div className="text-[#7b8f8a] text-sm">{successfulLogs.length} entries</div>
            <button
              onClick={exportCSV}
              className="px-3 py-1 rounded-md bg-[#135E3D] text-[#E8F8F5] text-sm font-semibold hover:bg-[#0f4f32]"
            >
              Export CSV
            </button>
          </div>
        </header>

        {message && (
          <div className="mb-3 text-[#1AA06D] font-semibold">{message}</div>
        )}

        {/* table header */}
        <div className="grid grid-cols-[220px_1fr_160px_120px] gap-0 text-sm text-[#7b8f8a] bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.04)] px-3 py-2 rounded-t-md">
          <div className="truncate">Timestamp</div>
          <div className="truncate">Event</div>
          <div className="truncate">User</div>
          <div className="text-right truncate">Result</div>
        </div>

        {/* list — full page scroll (no inner scrolling) */}
        <ul className="divide-y divide-[rgba(255,255,255,0.03)]">
          {successfulLogs.map((l, idx) => (
            <li
              key={l.id ?? `${l.timestamp}-${idx}`}
              className={`grid grid-cols-[220px_1fr_160px_120px] gap-0 px-3 py-3 text-sm items-center
                ${idx % 2 === 0 ? 'bg-transparent' : 'bg-[rgba(255,255,255,0.01)]'}`}
            >
              <div className="text-[#7b8f8a] text-xs truncate">{formatDateTime(l.timestamp)}</div>

              <div className="min-w-0">
                <div className="text-[#E8F8F5] font-medium truncate">{l.action}</div>
                {l.details && <div className="text-[#E8F8F5] text-xs mt-1 truncate opacity-90">{l.details}</div>}
              </div>

              <div className="text-[#E8F8F5] font-semibold truncate">{l.user}</div>

              <div className="text-right flex items-center justify-end gap-2">
                <div className="px-2 py-1 rounded-full bg-[#1AA06D] text-[#E8F8F5] text-xs font-semibold">{l.result}</div>

                <button
                  onClick={() => {
                    const txt = `${formatDateTime(l.timestamp)} — ${l.user} — ${l.action} — ${l.details ?? ''}`;
                    navigator.clipboard?.writeText(txt)
                      .then(() => setMessage('Copied entry'))
                      .catch(() => setMessage('Copy failed'));
                    setTimeout(() => setMessage(''), 1600);
                  }}
                  className="px-2 py-1 rounded-md border border-[rgba(255,255,255,0.05)] bg-transparent text-[#E8F8F5] text-xs"
                >
                  Copy
                </button>

                <button
                  onClick={() => {
                    const m = String(l.details || '').match(/A-[0-9]+/i);
                    if (m && m[0]) {
                      window.open(`${window.location.origin}/police/application/${m[0]}`, '_blank');
                    } else {
                      setMessage('No application id found in details.');
                      setTimeout(() => setMessage(''), 1600);
                    }
                  }}
                  className="px-2 py-1 rounded-md bg-[#135E3D] text-[#E8F8F5] text-xs font-semibold"
                >
                  Open
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
