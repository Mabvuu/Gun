import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

function getAuthHeader() {
  try {
    const keys = ['access_token', 'supabase.auth.token', 'sb:token'];
    for (const k of keys) {
      const v = localStorage.getItem(k);
      if (v) {
        try { const p = JSON.parse(v); if (p?.access_token) return `Bearer ${p.access_token}`; } catch { return `Bearer ${v}`; }
      }
    }
    const cookie = document.cookie.split(';').map(c => c.trim()).find(c => c.startsWith('sb-access-token='));
    if (cookie) return `Bearer ${decodeURIComponent(cookie.split('=')[1])}`;
  } catch (e) { console.warn(e); }
  return null;
}

export default function Progress() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const fetchApps = async () => {
    try {
      setLoading(true); setErr('');
      const headers = { Accept: 'application/json' };
      const auth = getAuthHeader(); if (auth) headers.Authorization = auth;
      const dealerKey = localStorage.getItem('dealer_api_key'); if (dealerKey) headers['x-dealer-api-key'] = dealerKey;
      const res = await axios.get(`${API_BASE}/applications?dealer_view=true`, { headers });
      setApps(res.data.results || res.data || []);
    } catch (e) {
      console.error('fetch dealer apps', e);
      setErr(e?.response?.data?.error || e.message || 'Failed to load');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchApps(); }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Applications — Tracker</h2>
        <button onClick={fetchApps} className="px-3 py-1 border rounded">Refresh</button>
      </div>

      {loading && <div className="text-sm text-gray-500">Loading…</div>}
      {err && <div className="text-sm text-red-600 mb-3">{err}</div>}

      <div className="space-y-3">
        {apps.length === 0 && !loading && <div className="text-sm text-gray-500">No applications found.</div>}
        {apps.map(a => (
          <div key={a.id} className="p-3 border rounded flex justify-between items-center">
            <div>
              <div className="font-medium">{a.title} {a.gun_id ? `• ${a.gun_id}` : ''}</div>
              <div className="text-xs text-gray-500">Applicant: {a.applicant_name || a.applicant_full_name || a.applicant_id || '-'} • Status: <span className="font-medium">{a.status}</span></div>
            </div>
            <div className="flex gap-2">
              <Link to={`/dealer/application/${a.id}`} className="px-3 py-1 border rounded text-sm">View</Link>
              <Link to={`/moj/receive/${a.id}`} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Open MOJ</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
