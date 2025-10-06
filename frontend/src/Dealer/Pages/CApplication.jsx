import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

// API base (Vite)
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

// same auth header helper used in GunPage
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
  } catch (e) {
    console.warn('getAuthHeader error', e && e.message);
  }
  return null;
}

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function Application() {
  const navigate = useNavigate();
  const query = useQuery();
  const gunId = query.get('gunId') || ''; // passed from GunPage

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [senderName, setSenderName] = useState('');
  const [file, setFile] = useState(null);

  // search state
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selected, setSelected] = useState(null); // selected applicant (object)
  const searchTimer = useRef(null);
  const [msg, setMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!gunId) setMsg('No gun selected — open Start Application from a gun page.');
  }, [gunId]);

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  // search function with debounce
  const searchProfiles = (term) => {
    if (!term || term.length < 2) {
      setResults([]);
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const authHeader = getAuthHeader();
        const headers = { Accept: 'application/json' };
        if (authHeader) headers.Authorization = authHeader;
        const dealerKey = localStorage.getItem('dealer_api_key');
        if (dealerKey) headers['x-dealer-api-key'] = dealerKey;

        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(term)}&limit=8`, {
          headers,
        });
        if (!res.ok) {
          const err = await res.text().catch(() => null);
          throw new Error(err || 'Search failed');
        }
        const body = await res.json();
        setResults(body.results || []);
      } catch (err) {
        console.error('search error', err);
        setResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  };

  const attachApplicant = (app) => {
    setSelected(app);
    setResults([]);
    setQ('');
    setMsg('');
  };

  // NOTE: backend flow endpoint is /api/flow/start (this sends JSON)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    setSuccessMsg('');

    if (!selected || !selected.applicant_id) {
      setMsg('Please select an applicant from search before sending.');
      return;
    }
    if (!gunId) {
      setMsg('Gun id missing — cannot create application.');
      return;
    }
    if (!title) {
      setMsg('Please enter a title.');
      return;
    }
    if (!senderName) {
      setMsg('Please enter your name.');
      return;
    }
    // attachments are NOT supported by the /flow/start JSON endpoint
    if (file) {
      setMsg('Attachments not supported by this endpoint. Remove file to submit.');
      return;
    }

    try {
      setLoading(true);

      const description = `Sender: ${senderName}${selected.full_name ? ` • Applicant: ${selected.full_name}` : ''}`;

      const body = {
        applicantId: selected.applicant_id,
        payload: {
          gunId,
          title,
          senderName,
          description
        },
        note: description,
        metadata: { createdFrom: 'frontend_application' }
      };

      const headers = { 'Content-Type': 'application/json' };
      const authHeader = getAuthHeader();
      if (authHeader) headers.Authorization = authHeader;
      const dealerKey = localStorage.getItem('dealer_api_key');
      if (dealerKey) headers['x-dealer-api-key'] = dealerKey;

      // send to the flow start API so app goes to MOJ phase
      await axios.post(`${API_BASE}/flow/start`, body, { headers });

      setSuccessMsg('Application sent to MOJ (Phase 1).');
      setTimeout(() => navigate('/dealer/applications'), 700);
    } catch (err) {
      console.error('create application error', err);
      const serverMsg = err?.response?.data?.error || err?.response?.data || err.message;
      setMsg(typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 flex justify-center">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow p-6">
        <h1 className="text-xl font-semibold mb-4">Create Application</h1>

        <div className="mb-4 text-sm text-gray-600">
          Gun: <span className="font-medium">{gunId || '—'}</span>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="block mb-2">
            <div className="text-sm text-gray-700">Title</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded p-2"
              placeholder="Short title"
              required
            />
          </label>

          <label className="block mb-2">
            <div className="text-sm text-gray-700">Your name (will appear in application)</div>
            <input
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="w-full border rounded p-2"
              placeholder="Enter your name"
              required
            />
          </label>

          <label className="block mb-4">
            <div className="text-sm text-gray-700">Attach PDF (optional)</div>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files[0] || null)}
            />
            <div className="text-xs text-gray-500 mt-1">Attachments are not sent to /flow/start — remove to submit.</div>
          </label>

          <div className="mb-4">
            <div className="text-sm text-gray-700 mb-1">Find applicant to attach</div>
            <div className="flex gap-2">
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); searchProfiles(e.target.value); }}
                placeholder="Type name, gov ID or applicant id..."
                className="flex-1 border rounded p-2"
              />
              <button type="button" onClick={() => searchProfiles(q)} className="px-3 py-1 border rounded">Search</button>
            </div>

            {searchLoading && <div className="text-sm text-gray-500 mt-2">Searching…</div>}

            {results && results.length > 0 && (
              <div className="mt-2 border rounded bg-white max-h-60 overflow-auto">
                {results.map(r => (
                  <div
                    key={r.id}
                    className="p-2 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                    onClick={() => attachApplicant(r)}
                  >
                    <div>
                      <div className="font-medium">{r.full_name}</div>
                      <div className="text-xs text-gray-500">{r.applicant_id || '-'} • {r.id_number || '-'}</div>
                    </div>
                    <div className="text-sm text-blue-600">Attach</div>
                  </div>
                ))}
              </div>
            )}

            {selected && (
              <div className="mt-3 p-3 bg-gray-50 rounded border">
                <div className="text-sm text-gray-700">Attached applicant:</div>
                <div className="font-medium">{selected.full_name}</div>
                <div className="text-xs text-gray-500">{selected.applicant_id} • {selected.id_number}</div>
                <button type="button" onClick={() => setSelected(null)} className="mt-2 text-sm text-red-600">Remove</button>
              </div>
            )}
          </div>

          {msg && <div className="mb-3 text-sm text-red-600">{msg}</div>}
          {successMsg && <div className="mb-3 text-sm text-green-600">{successMsg}</div>}

          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded">
              {loading ? 'Sending…' : 'Send to Phase 1'}
            </button>
            <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 border rounded">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
