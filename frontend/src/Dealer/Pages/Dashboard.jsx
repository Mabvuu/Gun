// src/Dealer/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

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
    const cookies = typeof document !== 'undefined' ? document.cookie.split(';').map((c) => c.trim()) : [];
    for (const c of cookies) {
      if (c.startsWith('sb-access-token=')) {
        const token = decodeURIComponent(c.split('=')[1]);
        if (token) return `Bearer ${token}`;
      }
    }
  } catch {
    // silent
  }
  return null;
}

export default function Dashboard() {
  const [guns, setGuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [modalGun, setModalGun] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchGuns() {
      setLoading(true);
      try {
        const headers = { Accept: 'application/json' };
        const auth = getAuthHeader();
        if (auth) headers.Authorization = auth;
        const devUser = localStorage.getItem('dev_user_id');
        if (devUser) headers['x-user-id'] = devUser;

        const { data: allGuns } = await axios.get('/api/dealer/guns', { headers });
        if (cancelled) return;

        const arr = Array.isArray(allGuns) ? allGuns : [];

        const visible = arr.filter((g) => {
          if (!g) return false;
          const deletedAt = g.deleted_at || g.deletedAt || null;
          const status = (g.status || '').toString();
          if (deletedAt) return false;
          if (status.toUpperCase() === 'DELETED_IN_APP') return false;
          return true;
        });

        // Add a fake minted token for simulation
        const simulatedToken = {
          id: 'sim123',
          serial: 'SIM-0001',
          token_id: 'FAKE-TOKEN-001',
          status: 'MINTED_ONCHAIN',
          photo_url: '/images/1.png', // correct path in public folder
          created_at: new Date().toISOString(),
          owner: 'Simulated Owner',
        };

        setGuns([...visible, simulatedToken]);
        setError(null);
      } catch {
        if (!cancelled) {
          setError('Could not load guns.');
          setGuns([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchGuns();
    return () => { cancelled = true; };
  }, []);

  const handleDelete = async (gun) => {
    if (!gun) return;
    const identifier = gun.id ?? gun.token_id ?? gun.serial;
    if (!identifier) {
      window.alert('Cannot delete: no identifier found for this gun.');
      return;
    }
    const confirmed = window.confirm(
      'Delete this gun from the app (soft-delete, does not touch blockchain). Are you sure?'
    );
    if (!confirmed) return;

    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.add(identifier);
      return next;
    });

    try {
      // Don't attempt to delete the simulated token
      if (identifier === 'sim123') {
        setGuns((prev) => prev.filter((g) => g.id !== 'sim123'));
        return;
      }

      const headers = { Accept: 'application/json' };
      const auth = getAuthHeader();
      if (auth) headers.Authorization = auth;
      const devUser = localStorage.getItem('dev_user_id');
      if (devUser) headers['x-user-id'] = devUser;

      await axios.delete(`/api/dealer/guns/${encodeURIComponent(identifier)}`, { headers });

      setGuns((prev) =>
        prev.filter((g) => {
          if (!g) return false;
          const matches =
            String(g.id ?? '') === String(identifier) ||
            String(g.token_id ?? '') === String(identifier) ||
            String(g.serial ?? '') === String(identifier);
          return !matches;
        })
      );
      setError(null);
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || String(err);
      window.alert('Could not delete gun: ' + msg);
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(gun.id ?? gun.token_id ?? gun.serial ?? identifier);
        return next;
      });
    }
  };

  const palette = {
    deepBlue: '#025067',
    teal: '#0B9FBD',
    plum: '#6C0E42',
    magenta: '#B31B6F',
    bgDark: '#071719',
    card: '#0e1e23',
    subtle: 'rgba(255,255,255,0.06)',
    text: '#E6EEF2',
    muted: 'rgba(255,255,255,0.6)',
    danger: '#E34A4A',
  };

  const statusBadge = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'MINTED_ONCHAIN') return { background: '#1B6A47', color: '#fff' };
    if (s === 'SALE_PENDING') return { background: '#B87E00', color: '#fff' };
    if (s === 'TRANSFERRED') return { background: palette.danger, color: '#fff' };
    return { background: '#2B3940', color: '#D6E6EA' };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: palette.bgDark }}>
        <div style={{ textAlign: 'center', color: palette.text }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 12px', borderRadius: 12, background: 'rgba(255,255,255,0.03)' }} />
          <div style={{ opacity: 0.9 }}>Loading…</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-6"
      style={{
        background: palette.bgDark,
        color: palette.text,
        fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
      }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 style={{ margin: 0, color: palette.text, fontSize: 20, fontWeight: 800 }}>
              Dealer Dashboard
            </h1>
            <div style={{ color: palette.muted, fontSize: 13, marginTop: 4 }}>Inventory · Mint · Transfers</div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <Link
              to="/dealer/mint"
              className="inline-flex items-center"
              style={{
                background: palette.magenta,
                color: '#fff',
                padding: '8px 12px',
                borderRadius: 8,
                fontWeight: 700,
                height: 38,
                alignItems: 'center',
                textDecoration: 'none',
                boxShadow: 'none',
                border: 'none',
              }}
            >
              + Mint
            </Link>

            <Link
              to="/dealer/sales"
              className="inline-flex items-center"
              style={{
                background: 'transparent',
                color: palette.text,
                padding: '8px 12px',
                borderRadius: 8,
                border: `1px solid ${palette.subtle}`,
                textDecoration: 'none',
                fontWeight: 600,
                height: 38,
                alignItems: 'center',
              }}
            >
              Sales
            </Link>
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(255,0,0,0.04)', color: '#FFB4B4', padding: 10, borderRadius: 8, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {guns.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 28, borderRadius: 10, background: palette.card }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>No guns available</div>
              <div style={{ color: palette.muted, marginTop: 6 }}>Try minting new inventory or check the sales queue.</div>
            </div>
          ) : (
            guns.map((gun) => {
              const keyId = gun.id ?? gun.token_id ?? gun.serial ?? Math.random().toString(36).slice(2, 9);
              const isDeletingFlag =
                deletingIds.has(gun.id) ||
                deletingIds.has(gun.token_id) ||
                deletingIds.has(gun.serial) ||
                (keyId && deletingIds.has(keyId));

              const statusRaw = (gun.status ?? '—').toString().replace(/_/g, ' ');
              const badgeStyle = statusBadge(gun.status);

              return (
                <div
                  key={keyId}
                  style={{
                    background: palette.card,
                    border: `1px solid ${palette.subtle}`,
                    padding: 12,
                    borderRadius: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    minHeight: 140,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      {gun.photo_url ? (
                        <img
                          src={gun.photo_url}
                          alt="Gun"
                          style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: `1px solid rgba(255,255,255,0.03)` }}
                          onError={(ev) => { ev.target.onerror = null; ev.target.src = '/images/1.png'; }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: 8,
                            background: 'rgba(255,255,255,0.02)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: palette.muted,
                            fontSize: 13,
                          }}
                        >
                          No photo
                        </div>
                      )}

                      <div>
                        <div style={{ fontWeight: 700, color: palette.text, fontSize: 14 }}>
                          {gun.serial_enc ?? gun.serial ?? '—'}
                        </div>
                        <div style={{ fontSize: 12, color: palette.muted, marginTop: 6 }}>{gun.token_id ?? 'Token —'}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                      <div
                        style={{
                          padding: '6px 10px',
                          borderRadius: 9999,
                          fontSize: 12,
                          fontWeight: 700,
                          color: badgeStyle.color,
                          background: badgeStyle.background,
                          minWidth: 88,
                          textAlign: 'center',
                        }}
                      >
                        {statusRaw}
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        {/* Details button */}
                        <Link
                          to={gun.id === 'sim123' ? '#' : `/dealer/gun/${gun.id}`}
                          onClick={(e) => {
                            if (gun.id === 'sim123') {
                              e.preventDefault();
                              setModalGun(gun);
                            }
                          }}
                          style={{
                            background: palette.deepBlue,
                            color: '#fff',
                            padding: '8px 12px',
                            borderRadius: 8,
                            textDecoration: 'none',
                            fontWeight: 700,
                            fontSize: 13,
                            height: 36,
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                        >
                          Details
                        </Link>

                        <button
                          onClick={() => handleDelete(gun)}
                          disabled={isDeletingFlag}
                          style={{
                            background: isDeletingFlag ? 'rgba(255,255,255,0.03)' : palette.magenta,
                            color: '#fff',
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: 'none',
                            cursor: isDeletingFlag ? 'default' : 'pointer',
                            fontWeight: 700,
                            fontSize: 13,
                            height: 36,
                            display: 'inline-flex',
                            alignItems: 'center',
                            boxShadow: isDeletingFlag ? 'none' : '0 6px 12px rgba(179,27,111,0.08)',
                            opacity: isDeletingFlag ? 0.8 : 1,
                          }}
                        >
                          {isDeletingFlag ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: `1px solid ${palette.subtle}`, paddingTop: 8, display: 'flex', justifyContent: 'space-between', color: palette.muted, fontSize: 13 }}>
                    <div>
                      <div style={{ fontSize: 12 }}>Created</div>
                      <div style={{ marginTop: 4, color: palette.text }}>{gun.created_at ? new Date(gun.created_at).toLocaleString() : '—'}</div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12 }}>Owner</div>
                      <div style={{ marginTop: 4, color: palette.text }}>{gun.owner ?? '—'}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal for simulated gun details */}
      {modalGun && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
          onClick={() => setModalGun(null)}
        >
          <div
            style={{
              background: palette.card,
              padding: 24,
              borderRadius: 12,
              minWidth: 300,
              color: palette.text,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0 }}>Simulated Gun Details</h2>
            <p><strong>Serial:</strong> {modalGun.serial}</p>
            <p><strong>Token ID:</strong> {modalGun.token_id}</p>
            <p><strong>Status:</strong> {modalGun.status.replace(/_/g, ' ')}</p>
            <p><strong>Owner:</strong> {modalGun.owner}</p>
            <p><strong>Created:</strong> {new Date(modalGun.created_at).toLocaleString()}</p>
            <img
              src="/images/1.png"
              alt="Simulated Gun"
              style={{ width: '100%', marginTop: 12, borderRadius: 8 }}
            />
            <button
              onClick={() => setModalGun(null)}
              style={{
                marginTop: 16,
                background: palette.magenta,
                color: '#fff',
                border: 'none',
                padding: '8px 12px',
                borderRadius: 8,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
