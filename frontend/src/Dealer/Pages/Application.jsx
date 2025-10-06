// frontend/src/Dealer/Pages/Application.jsx
import React, { useState } from 'react';
import { createApplication } from '../../shared/api';

export default function Application() {
  const [dealerName, setDealerName] = useState('');
  const [token, setToken] = useState('');
  const [province, setProvince] = useState('');
  const [town, setTown] = useState('');
  const [applicantId, setApplicantId] = useState('');
  const [foundApplicant, setFoundApplicant] = useState(null);
  const [file, setFile] = useState(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Dealer palette (matches Nav.jsx / Dashboard)
  const palette = {
    deepBlue: '#025067',
    teal: '#0B9FBD',
    plum: '#6C0E42',
    magenta: '#B31B6F',
    subtle: 'rgba(255,255,255,0.06)',
    text: '#E6EEF2',
    muted: 'rgba(255,255,255,0.6)',
    bg: '#071719',
  };

  async function searchApplicant() {
    setFoundApplicant(null);
    setError(null);
    if (!applicantId) return setError('Provide applicant id');
    try {
      const res = await fetch(`/api/applicants/${encodeURIComponent(applicantId)}`);
      if (!res.ok) {
        setError('Applicant not found');
        return;
      }
      const data = await res.json();
      setFoundApplicant(data);
    } catch {
      setError('Search failed');
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!dealerName || !token || !province || !town || !applicantId) {
      setError('Missing required fields');
      return;
    }

    const form = new FormData();
    form.append('dealerName', dealerName);
    form.append('token', token);
    form.append('province', province);
    form.append('town', town);
    form.append('applicantId', applicantId);
    form.append('note', note);
    if (file) form.append('file', file);

    try {
      setLoading(true);
      const res = await createApplication(form);

      // keep a small local signal for other tabs/components
      localStorage.setItem('application_submitted_at', String(Date.now()));

      // show result on this page (do NOT navigate away)
      setResult(res);
      setError(null);

      // clear form fields but keep dealerName/token if you want; here we clear everything except dealerName
      setToken('');
      setProvince('');
      setTown('');
      setApplicantId('');
      setFoundApplicant(null);
      setNote('');
      setFile(null);
    } catch (err) {
      const msg = err?.message || (err?.response && JSON.stringify(err.response)) || 'Submit failed';
      setError(msg);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: palette.bg, minHeight: '100vh', padding: 24, color: palette.text, fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ background: '#0e1e23', borderRadius: 12, padding: 18, border: `1px solid ${palette.subtle}`, boxShadow: '0 8px 30px rgba(2,6,23,0.5)' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: palette.text }}>Application to MOJ</h2>
          <p style={{ marginTop: 6, color: palette.muted }}>Fill the form below and click Send. You'll see a confirmation on this page.</p>

          {/* result / success banner */}
          {result && (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: 'linear-gradient(90deg, rgba(179,27,111,0.12), rgba(11,159,189,0.06))', color: palette.text }}>
              <div style={{ fontWeight: 700 }}>Your application has been sent</div>
              <div style={{ marginTop: 6, color: palette.muted }}>
                Application ID: <span style={{ color: palette.text }}>{result.applicationId ?? result.id ?? '—'}</span>
                {result.status ? <span> · Status: <strong style={{ color: palette.text }}>{result.status}</strong></span> : null}
              </div>
            </div>
          )}

          {/* error */}
          {error && (
            <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(227,74,74,0.06)', color: '#FFB4B4' }}>
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} style={{ marginTop: 14 }} className="space-y-4">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={{ display: 'block' }}>
                <div style={{ fontSize: 13, color: palette.muted }}>Dealer name</div>
                <input
                  value={dealerName}
                  onChange={e => setDealerName(e.target.value)}
                  required
                  style={{ marginTop: 6, width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${palette.subtle}`, background: 'transparent', color: palette.text }}
                />
              </label>

              <label style={{ display: 'block' }}>
                <div style={{ fontSize: 13, color: palette.muted }}>Token</div>
                <input
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  required
                  style={{ marginTop: 6, width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${palette.subtle}`, background: 'transparent', color: palette.text }}
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label>
                <div style={{ fontSize: 13, color: palette.muted }}>Province</div>
                <input value={province} onChange={e => setProvince(e.target.value)} required style={{ marginTop: 6, width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${palette.subtle}`, background: 'transparent', color: palette.text }} />
              </label>

              <label>
                <div style={{ fontSize: 13, color: palette.muted }}>Town</div>
                <input value={town} onChange={e => setTown(e.target.value)} required style={{ marginTop: 6, width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${palette.subtle}`, background: 'transparent', color: palette.text }} />
              </label>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <label style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: palette.muted }}>Attach applicant (id)</div>
                <input value={applicantId} onChange={e => setApplicantId(e.target.value)} required style={{ marginTop: 6, width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${palette.subtle}`, background: 'transparent', color: palette.text }} />
              </label>

              <button
                type="button"
                onClick={searchApplicant}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: palette.deepBlue,
                  color: '#fff',
                  border: 'none',
                  height: 40,
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                Search
              </button>
            </div>

            {foundApplicant && (
              <div style={{ marginTop: 6, padding: 12, borderRadius: 8, background: '#081617', border: `1px solid ${palette.subtle}` }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: palette.text }}>Applicant found</div>
                <div style={{ marginTop: 6, color: palette.muted }}>ID: {foundApplicant.id ?? foundApplicant._id ?? applicantId}</div>
                {foundApplicant.name && <div style={{ color: palette.muted }}>Name: {foundApplicant.name}</div>}
              </div>
            )}

            <label>
              <div style={{ fontSize: 13, color: palette.muted }}>Upload PDF</div>
              <input type="file" accept="application/pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} style={{ marginTop: 6 }} />
              {file && <div style={{ marginTop: 8, color: palette.muted }}>{file.name}</div>}
            </label>

            <label>
              <div style={{ fontSize: 13, color: palette.muted }}>Note (will show your dealer name)</div>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} style={{ marginTop: 6, width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${palette.subtle}`, background: 'transparent', color: palette.text }} />
            </label>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '10px 16px',
                  borderRadius: 8,
                  background: palette.magenta,
                  color: '#fff',
                  border: 'none',
                  cursor: loading ? 'default' : 'pointer',
                  fontWeight: 800,
                  minWidth: 160,
                }}
              >
                {loading ? 'Submitting…' : 'Send application'}
              </button>

              {/* secondary: keep compact, low-contrast */}
              <button
                type="button"
                onClick={() => {
                  // quick clear but not necessary
                  setApplicantId(''); setFoundApplicant(null); setFile(null); setNote('');
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'transparent',
                  color: palette.muted,
                  border: `1px solid ${palette.subtle}`,
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>

              {/* feedback */}
              {result && (
                <div style={{ color: '#9EEBCF', fontWeight: 700 }}>
                  Sent — id {result.applicationId ?? result.id ?? '—'} · {result.status ?? '—'}
                </div>
              )}

              {error && (
                <div style={{ color: '#FFB4B4', fontWeight: 700 }}>
                  {error}
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

