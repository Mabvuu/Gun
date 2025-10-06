// frontend/src/pages/MOJPage.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

// Vite exposes env vars on import.meta.env and they must be prefixed with VITE_
const VITE_API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) || '';

const api = axios.create({
  baseURL: VITE_API_BASE_URL || '',
  headers: { 'x-role': 'moj' } // remove or replace with proper auth in production
});

export default function MojPage() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchList();
  }, []);

  async function fetchList() {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/api/flow', { params: { status: 'phase_moj' } });
      setApps(res.data.results || []);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'fetch error');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdvance(appId) {
    try {
      setError('');
      const res = await api.post(`/api/flow/${appId}/advance`, { note });
      setApps(prev => prev.filter(a => a.id !== appId));
      if (selected && selected.id === appId) setSelected(res.data.application);
      setNote('');
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'advance failed');
    }
  }

  async function handleReject(appId) {
    if (!reason) { setError('Provide rejection reason'); return; }
    try {
      setError('');
      await api.post(`/api/flow/${appId}/reject`, { reason });
      setApps(prev => prev.filter(a => a.id !== appId));
      setReason('');
      if (selected && selected.id === appId) setSelected(null);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'reject failed');
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: 'Inter, Arial, sans-serif' }}>
      <h2>MOJ Queue</h2>
      {error && <div style={{ color: 'crimson', marginBottom: 8 }}>{error}</div>}
      <div style={{ marginBottom: 12 }}>
        <button onClick={fetchList} disabled={loading}>Refresh</button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : apps.length === 0 ? (
        <div>No applications in MOJ</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Applicant</th>
              <th style={th}>App ID</th>
              <th style={th}>Updated</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {apps.map(a => (
              <tr key={a.id} style={{ borderTop: '1px solid #eee' }}>
                <td style={td}>{a.payload?.name || a.applicantId}</td>
                <td style={td} title={a.id}>{a.id?.slice(0, 10) ?? a.id}…</td>
                <td style={td}>{a.updated_at ? new Date(a.updated_at).toLocaleString() : '—'}</td>
                <td style={td}>
                  <button onClick={() => setSelected(a)}>View</button>{' '}
                  <button onClick={() => handleAdvance(a.id)}>Advance →</button>{' '}
                  <button onClick={() => { setSelected(a); }}>Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <div style={panel}>
          <h3>Application</h3>
          <div style={{ marginBottom: 8 }}>
            <strong>App ID:</strong> {selected.id}
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong>Applicant:</strong> {selected.payload?.name || selected.applicantId}
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong>Status:</strong> {selected.status}
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong>Payload:</strong>
            <pre style={{ whiteSpace: 'pre-wrap', background: '#fafafa', padding: 8, borderRadius: 4 }}>
              {JSON.stringify(selected.payload || {}, null, 2)}
            </pre>
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong>Logs:</strong>
            <pre style={{ whiteSpace: 'pre-wrap', background: '#fafafa', padding: 8, borderRadius: 4 }}>
              {JSON.stringify(selected.logs || [], null, 2)}
            </pre>
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ display: 'block', marginBottom: 6 }}>Note (optional) for advance</label>
            <input value={note} onChange={e => setNote(e.target.value)} style={{ width: '100%', padding: 8 }} />
            <div style={{ marginTop: 8 }}>
              <button onClick={() => handleAdvance(selected.id)}>Advance to Club</button>{' '}
              <button onClick={() => { setSelected(null); setNote(''); }}>Close</button>
            </div>
          </div>

          <hr style={{ margin: '12px 0' }} />

          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Reject reason (required)</label>
            <input value={reason} onChange={e => setReason(e.target.value)} style={{ width: '100%', padding: 8 }} />
            <div style={{ marginTop: 8 }}>
              <button onClick={() => handleReject(selected.id)}>Reject</button>{' '}
              <button onClick={() => setReason('')}>Clear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// tiny inline styles
const th = { textAlign: 'left', padding: '8px 6px', fontSize: 13 };
const td = { padding: '8px 6px', fontSize: 13, verticalAlign: 'top' };
const panel = { marginTop: 18, padding: 12, border: '1px solid #e6e6e6', borderRadius: 6, background: '#fff' };
