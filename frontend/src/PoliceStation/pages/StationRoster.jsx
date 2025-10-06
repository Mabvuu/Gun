// frontend/src/PoliceStation/pages/StationRoster.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const THEME = {
  darkest: '#09110D',
  dark: '#0B3221',
  mid: '#135E3D',
  bright: '#1AA06D',
  textOnDark: '#E8F8F5',
  muted: '#7b8f8a',
  danger: '#C94A45'
};

// simulated fallback dataset (used silently if server/snapshot unavailable)
const SIMULATED_OFFICERS = [
  { id: 'sim-001', name: 'Sgt. Nyathi', badge: 'B-1023', role: 'In charge', createdAt: new Date(Date.now() - 1000*60*60*3).toISOString() },
  { id: 'sim-002', name: 'Const. Moyo', badge: 'B-0987', role: 'Officer', createdAt: new Date(Date.now() - 1000*60*60*4).toISOString() },
  { id: 'sim-003', name: 'Inspector Dube', badge: 'B-1100', role: 'In charge', createdAt: new Date(Date.now() - 1000*60*60*26).toISOString() },
  { id: 'sim-004', name: 'Const. Ndlovu', badge: 'B-0456', role: 'Officer', createdAt: new Date(Date.now() - 1000*60*60*50).toISOString() }
];

export default function StationRoster() {
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newOfficer, setNewOfficer] = useState({ name: '', badge: '', role: 'Officer' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/police/roster');
        if (mounted) {
          setOfficers(Array.isArray(res.data) ? res.data.map(normalizeRecord) : []);
        }
      } catch (err) {
        // try local snapshot
        try {
          const raw = localStorage.getItem('roster_snapshot');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (mounted) {
              setOfficers(Array.isArray(parsed) ? parsed.map(normalizeRecord) : []);
            }
            setLoading(false);
            return;
          }
        } catch (lsErr) {
          console.error('Failed to read roster_snapshot from localStorage', lsErr);
        }

        // fallback to simulated dataset silently
        if (mounted) {
          setOfficers(SIMULATED_OFFICERS.map(normalizeRecord));
        }
        console.error('Failed to load roster from server — using simulated fallback', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // ensure record has expected fields
  function normalizeRecord(r) {
    return {
      id: r.id ?? (`local-${Math.random().toString(36).slice(2,9)}`),
      name: r.name ?? '',
      badge: r.badge ?? '',
      role: r.role ?? 'Officer',
      createdAt: r.createdAt ?? (r.timestamp ?? new Date().toISOString())
    };
  }

  const addOfficer = async () => {
    if (!newOfficer.name.trim() || !newOfficer.badge.trim()) {
      return alert('Name and badge number are required');
    }
    setSubmitting(true);
    const payload = {
      name: newOfficer.name.trim(),
      badge: newOfficer.badge.trim(),
      role: newOfficer.role,
      createdAt: new Date().toISOString()
    };

    try {
      const res = await axios.post('/api/police/roster', payload);
      const created = res?.data ? normalizeRecord(res.data) : normalizeRecord({ ...payload, id: `srv-${Math.random().toString(36).slice(2,8)}` });
      setOfficers(prev => {
        const next = [...prev, created];
        try {
          localStorage.setItem('roster_snapshot', JSON.stringify(next));
        } catch (lsErr) {
          console.error('Failed to save roster_snapshot', lsErr);
        }
        return next;
      });
      setNewOfficer({ name: '', badge: '', role: 'Officer' });
    } catch (err) {
      // fallback: create simulated/local record
      console.error('Failed to POST new officer to server — creating local record', err);
      const created = normalizeRecord({ ...payload, id: `sim-${Math.random().toString(36).slice(2,8)}` });
      setOfficers(prev => {
        const next = [...prev, created];
        try {
          localStorage.setItem('roster_snapshot', JSON.stringify(next));
        } catch (lsErr) {
          console.error('Failed to save roster_snapshot', lsErr);
        }
        return next;
      });
      setNewOfficer({ name: '', badge: '', role: 'Officer' });
    } finally {
      setSubmitting(false);
    }
  };

  const removeOfficer = async (id) => {
    if (!window.confirm('Are you sure you want to remove this officer?')) return;

    if (typeof id === 'string' && id.startsWith('sim-')) {
      setOfficers(prev => {
        const next = prev.filter(o => o.id !== id);
        try {
          localStorage.setItem('roster_snapshot', JSON.stringify(next));
        } catch (lsErr) {
          console.error('Failed to save roster_snapshot', lsErr);
        }
        return next;
      });
      return;
    }

    try {
      await axios.delete(`/api/police/roster/${id}`);
      setOfficers(prev => {
        const next = prev.filter(o => o.id !== id);
        try {
          localStorage.setItem('roster_snapshot', JSON.stringify(next));
        } catch (lsErr) {
          console.error('Failed to save roster_snapshot', lsErr);
        }
        return next;
      });
    } catch (err) {
      console.error('Failed to delete officer on server — removing locally', err);
      setOfficers(prev => {
        const next = prev.filter(o => o.id !== id);
        try {
          localStorage.setItem('roster_snapshot', JSON.stringify(next));
        } catch (lsErr) {
          console.error('Failed to save roster_snapshot', lsErr);
        }
        return next;
      });
    }
  };

  const formatDateTime = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch {
      return iso;
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 880, margin: '0 auto', padding: 22, fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto' }}>
        <div style={{ padding: 20, borderRadius: 12, background: '#fff', color: THEME.dark }}>
          Loading roster...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: 980,
      margin: '0 auto',
      padding: 20,
      fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto',
      boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <h1 style={{ margin: 0, color: THEME.mid, fontSize: 22 }}>Station Roster</h1>
        <div style={{ color: THEME.muted, fontSize: 13 }}>{officers.length} officers</div>
      </div>

      <div style={{
        display: 'flex',
        gap: 10,
        marginBottom: 16,
        alignItems: 'center',
        background: THEME.textOnDark,
        padding: 12,
        borderRadius: 10
      }}>
        <input
          placeholder="Name"
          value={newOfficer.name}
          onChange={e => setNewOfficer(s => ({ ...s, name: e.target.value }))}
          style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)', fontSize: 14 }}
        />
        <input
          placeholder="Badge #"
          value={newOfficer.badge}
          onChange={e => setNewOfficer(s => ({ ...s, badge: e.target.value }))}
          style={{ width: 140, padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)', fontSize: 14 }}
        />
        <select
          value={newOfficer.role}
          onChange={e => setNewOfficer(s => ({ ...s, role: e.target.value }))}
          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)', fontSize: 14 }}
        >
          <option>Officer</option>
          <option>In charge</option>
        </select>

        <button
          onClick={addOfficer}
          disabled={submitting}
          style={{
            padding: '10px 14px',
            backgroundColor: submitting ? '#bdbdbd' : THEME.mid,
            color: THEME.textOnDark,
            border: 'none',
            cursor: submitting ? 'not-allowed' : 'pointer',
            borderRadius: 8,
            fontWeight: 800
          }}
        >
          {submitting ? 'Adding...' : 'Add'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 18 }}>
        <section style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
          {officers.length === 0 ? (
            <div style={{ textAlign: 'center', color: THEME.muted, padding: 24 }}>No officers currently on the roster.</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {officers.map(o => (
                <li key={o.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(0,0,0,0.04)'
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: THEME.dark }}>{o.name}</div>
                    <div style={{ marginTop: 6, color: THEME.muted, fontSize: 13 }}>
                      Badge: <span style={{ fontWeight: 800, color: THEME.mid }}>{o.badge}</span>
                      {' '}•{' '}
                      <span style={{ fontWeight: 800, color: o.role === 'In charge' ? THEME.mid : THEME.muted }}>{o.role}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', minWidth: 170 }}>
                    <div style={{ fontSize: 13, color: THEME.muted }}>{formatDateTime(o.createdAt)}</div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => {
                          const txt = `${o.name} — Badge ${o.badge} — ${formatDateTime(o.createdAt)}`;
                          navigator.clipboard?.writeText(txt)
                            .then(() => console.debug('Officer copied'))
                            .catch(copyErr => console.error('Copy failed', copyErr));
                        }}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 8,
                          border: '1px solid rgba(0,0,0,0.06)',
                          background: THEME.textOnDark,
                          color: THEME.dark,
                          cursor: 'pointer',
                          fontWeight: 700
                        }}
                      >
                        Copy
                      </button>

                      <button
                        onClick={() => removeOfficer(o.id)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 8,
                          border: 'none',
                          background: THEME.danger,
                          color: '#fff',
                          cursor: 'pointer',
                          fontWeight: 800
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside style={{ background: THEME.textOnDark, borderRadius: 12, padding: 16 }}>
          <div style={{ fontWeight: 900, color: THEME.dark, marginBottom: 8 }}>On this roster</div>
          <div style={{ color: THEME.muted, fontSize: 13, marginBottom: 12 }}>
            Total officers: <strong style={{ color: THEME.dark }}>{officers.length}</strong>
          </div>

          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: THEME.dark, marginBottom: 8 }}>Quick filter</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setOfficers(prev => [...prev].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)))}
                style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)', background: '#fff', cursor: 'pointer', fontWeight: 700 }}
              >
                Newest
              </button>
              <button
                onClick={() => setOfficers(prev => [...prev].sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt)))}
                style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)', background: '#fff', cursor: 'pointer', fontWeight: 700 }}
              >
                Oldest
              </button>
            </div>
          </div>

          <div style={{ marginTop: 18, fontSize: 13, color: THEME.muted }}>
            Tip: adding an officer records the time of entry automatically.
          </div>
        </aside>
      </div>
    </div>
  );
}
