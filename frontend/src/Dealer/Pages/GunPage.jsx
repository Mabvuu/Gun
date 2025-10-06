// src/Dealer/GunPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

function getAuthHeader() {
  try {
    const possible = ['access_token', 'supabase.auth.token', 'sb:token'];
    for (const k of possible) {
      const v = localStorage.getItem(k);
      if (v) {
        try {
          const parsed = JSON.parse(v);
          if (parsed && parsed.access_token) return `Bearer ${parsed.access_token}`;
        } catch  {
          return `Bearer ${v}`;
        }
      }
    }
    const cookies = (typeof document !== 'undefined' ? document.cookie : '').split(';').map(c => c.trim());
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

export default function GunPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [gun, setGun] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchGun = useCallback(async () => {
    setLoading(true);
    setError(null);
    setGun(null);

    const authHeader = getAuthHeader();
    const headers = { Accept: 'application/json' };
    if (authHeader) headers.Authorization = authHeader;
    const devUser = localStorage.getItem('dev_user_id');
    if (devUser) headers['x-user-id'] = devUser;

    try {
      const primaryUrl = `/api/dealer/guns/${encodeURIComponent(id)}`;
      const primaryRes = await axios.get(primaryUrl, { headers });
      const result = primaryRes.data?.gun ?? primaryRes.data ?? null;
      setGun(result);
      setLoading(false);
      return;
    } catch (primaryErr) {
      if (primaryErr.response && (primaryErr.response.status === 401 || primaryErr.response.status === 403)) {
        setError(primaryErr.response.status === 401 ? 'Unauthorized (401).' : 'Forbidden (403).');
        setLoading(false);
        return;
      }
    }

    try {
      const listRes = await axios.get('/api/dealer/guns', { headers });
      const list = listRes.data || [];
      const candidate = list.find(g => {
        if (!g) return false;
        if (typeof g.token_id === 'string' && g.token_id === id) return true;
        if (String(g.id) === String(id)) return true;
        if (typeof g.serial === 'string' && g.serial === id) return true;
        if (typeof g.token_id === 'string' && id && g.token_id.includes(id)) return true;
        return false;
      });

      if (!candidate) {
        setError('Gun not found by id/token_id/serial.');
        setLoading(false);
        return;
      }
      setGun(candidate);
    } catch {
      setError('Could not fetch guns list for fallback.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchGun();
  }, [fetchGun]);

  const handleRefresh = () => fetchGun();
  const goToMint = () => navigate('/dealer/mint');

  const startApplication = () => {
    const gunId = gun?.token_id ?? gun?.id ?? null;
    if (!gunId) return alert('Gun id not available');
    navigate(`/dealer/apply?gunId=${encodeURIComponent(gunId)}`);
  };

  const imageUrl = gun?.photo_url ?? (gun?.photo_storage_path ? `/storage/${encodeURIComponent(gun.photo_storage_path)}` : (gun?.photo_name ? `/uploads/${encodeURIComponent(gun.photo_name)}` : null));

  // Palette (matches Nav)
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

  const statusStyle = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'MINTED_ONCHAIN') return { background: '#1B6A47', color: '#fff' };
    if (s === 'SALE_PENDING') return { background: '#B87E00', color: '#fff' };
    if (s === 'TRANSFERRED') return { background: palette.danger, color: '#fff' };
    return { background: '#223238', color: '#D6E6EA' };
  };

  return (
    <div
      className="min-h-screen py-8 px-4 flex justify-center"
      style={{ background: palette.bgDark, color: palette.text, fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto' }}
    >
      <div className="w-full max-w-4xl" style={{ padding: 18 }}>
        <div style={{ background: palette.card, borderRadius: 12, boxShadow: '0 8px 24px rgba(2,6,23,0.5)', border: `1px solid ${palette.subtle}`, padding: 18 }}>
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 style={{ margin: 0, color: palette.text, fontSize: 20, fontWeight: 800 }}>Gun details</h1>
              <div style={{ color: palette.muted, fontSize: 13, marginTop: 4 }}>{id}</div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={handleRefresh}
                className="text-sm"
                style={{
                  background: 'transparent',
                  color: palette.text,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: `1px solid ${palette.subtle}`,
                  height: 38,
                }}
              >
                Refresh
              </button>

              <button
                onClick={goToMint}
                className="text-sm"
                style={{
                  background: palette.deepBlue,
                  color: '#fff',
                  padding: '8px 12px',
                  borderRadius: 8,
                  height: 38,
                  border: 'none',
                }}
              >
                Mint new
              </button>

              <button
                onClick={startApplication}
                className="text-sm"
                title="Start an application for this gun"
                style={{
                  background: palette.magenta,
                  color: '#fff',
                  padding: '8px 12px',
                  borderRadius: 8,
                  height: 38,
                  border: 'none',
                }}
              >
                Start Application
              </button>
            </div>
          </div>

          {loading && <div style={{ color: palette.muted }}>Loading…</div>}
          {error && <div style={{ color: '#FFB4B4', marginBottom: 12 }}>{error}</div>}

          {!loading && !error && !gun && (
            <div style={{ color: palette.muted, marginBottom: 12 }}>
              No data available for <strong style={{ color: palette.text }}>{id}</strong>.
            </div>
          )}

          {gun && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Image */}
                <div className="col-span-1">
                  <div style={{ background: '#0b1517', borderRadius: 8, padding: 10, textAlign: 'center', border: `1px solid ${palette.subtle}` }}>
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt="gun"
                        className="w-full h-48 object-cover rounded"
                        style={{ borderRadius: 8 }}
                        onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-gun.png'; }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: 192, display: 'flex', alignItems: 'center', justifyContent: 'center', color: palette.muted }}>
                        No photo
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button
                      onClick={() => navigator.clipboard?.writeText(JSON.stringify(gun))}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        color: palette.text,
                        border: `1px solid ${palette.subtle}`,
                        padding: '8px 10px',
                        borderRadius: 8,
                        fontSize: 13,
                      }}
                    >
                      Copy JSON
                    </button>
                    <button
                      onClick={() => window.open(imageUrl || '#', '_blank')}
                      style={{
                        background: palette.teal,
                        color: '#fff',
                        border: 'none',
                        padding: '8px 10px',
                        borderRadius: 8,
                        fontSize: 13,
                      }}
                      disabled={!imageUrl}
                    >
                      View
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="col-span-2">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div>
                      <h2 style={{ margin: 0, color: palette.text, fontSize: 18, fontWeight: 700 }}>
                        {gun.make ?? '—'} {gun.model ?? ''}
                      </h2>
                      <div style={{ color: palette.muted, fontSize: 13, marginTop: 6 }}>
                        Manufacturer: {gun.manufacturer ?? '—'}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: palette.muted }}>Status</div>
                      <div style={{ marginTop: 8 }}>
                        <span style={{ display: 'inline-block', padding: '6px 10px', borderRadius: 9999, fontWeight: 700, fontSize: 12, ...statusStyle(gun.status) }}>
                          {(gun.status ?? '—').toString().replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm" style={{ color: palette.muted }}>
                    <div><span style={{ color: palette.muted }}>DB id:</span> <span style={{ color: palette.text }}>{String(gun.id ?? '—')}</span></div>
                    <div><span style={{ color: palette.muted }}>Token id:</span> <span style={{ color: palette.text }}>{String(gun.token_id ?? '—')}</span></div>
                    <div><span style={{ color: palette.muted }}>Serial:</span> <span style={{ color: palette.text }}>{gun.serial ?? '—'}</span></div>
                    <div><span style={{ color: palette.muted }}>Caliber:</span> <span style={{ color: palette.text }}>{gun.caliber ?? '—'}</span></div>
                    <div><span style={{ color: palette.muted }}>Year made:</span> <span style={{ color: palette.text }}>{gun.year_made ?? '—'}</span></div>
                    <div><span style={{ color: palette.muted }}>TX hash:</span> <span style={{ color: palette.text }}>{gun.tx_hash ?? '—'}</span></div>
                  </div>

                  <div className="pt-4">
                    <div style={{ color: palette.muted, fontSize: 13 }}>Notes</div>
                    <div style={{ marginTop: 8, color: palette.text, whiteSpace: 'pre-wrap' }}>{gun.notes ?? '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

