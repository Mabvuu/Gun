// frontend/src/Dealer/Pages/ApplicationsList.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

function getAuthHeader() {
  try {
    const possible = ['access_token', 'supabase.auth.token', 'sb:token'];
    for (const k of possible) {
      const v = localStorage.getItem(k);
      if (v) {
        try {
          const parsed = JSON.parse(v);
          if (parsed && parsed.access_token) return `Bearer ${parsed.access_token}`;
        } catch {
          return `Bearer ${v}`;
        }
      }
    }
    const cookies = document.cookie.split(';').map(c => c.trim());
    for (const c of cookies) {
      if (c.startsWith('sb-access-token=')) {
        const token = decodeURIComponent(c.split('=')[1]);
        if (token) return `Bearer ${token}`;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export default function ApplicationsList() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const headers = { Accept: 'application/json' };
        const auth = getAuthHeader();
        if (auth) headers.Authorization = auth;
        const dealerKey = localStorage.getItem('dealer_api_key');
        if (dealerKey) headers['x-dealer-api-key'] = dealerKey;

        const res = await fetch(`${API_BASE}/applications`, { headers });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        if (!cancelled) setApps(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setErr(e.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Applications</h1>
        <Link to="/dealer/apply" className="px-3 py-1 bg-green-600 text-white rounded text-sm">Create Application</Link>
      </div>

      {loading && <div className="text-sm text-gray-600">Loading…</div>}
      {err && <div className="text-sm text-red-600 mb-4">{err}</div>}

      {!loading && apps.length === 0 && <div className="text-sm text-gray-700">No applications found.</div>}

      {!loading && apps.length > 0 && (
        <div className="bg-white rounded shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-3 text-left">Title</th>
                <th className="p-3 text-left">Applicant</th>
                <th className="p-3 text-left">Gun ID</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Created</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="p-3">{a.title || '—'}</td>
                  <td className="p-3">
                    <div className="font-medium">{a.applicant_name || a.full_name || a.applicant_id || '—'}</div>
                    <div className="text-xs text-gray-500">{a.applicant_id || ''}{a.id_number ? ` • ${a.id_number}` : ''}</div>
                  </td>
                  <td className="p-3">{a.gun_id || '—'}</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded text-xs bg-gray-100">{a.status || 'draft'}</span></td>
                  <td className="p-3">{a.created_at ? new Date(a.created_at).toLocaleString() : '—'}</td>
                  <td className="p-3">
                    <Link to={`/dealer/applications/${a.id}`} className="text-blue-600">Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
