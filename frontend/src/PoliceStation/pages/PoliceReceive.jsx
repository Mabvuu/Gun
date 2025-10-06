
// frontend/src/PoliceStation/pages/PoliceReceive.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react';

const rawBase = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
let API_BASE = String(rawBase).replace(/\/+$/,'');
API_BASE = API_BASE.replace(/\/api$/i,'');

const THEME = {
  darkest: '#09110D',
  dark: '#0B3221',
  mid: '#135E3D',
  bright: '#1AA06D',
  textOnDark: '#E8F8F5',
  muted: '#7b8f8a',
  danger: '#C94A45'
};

function bytesToSize(bytes = 0) {
  if (!bytes) return '0 B';
  const sizes = ['B','KB','MB','GB','TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

export default function PoliceReceive() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [officerId, setOfficerId] = useState('');
  const [certificateFile, setCertificateFile] = useState(null);
  const [note, setNote] = useState('');

  const [search, setSearch] = useState('');
  const [filterProvince, setFilterProvince] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const mountedRef = useRef(false); // avoid double-load in StrictMode

  function buildUrl() {
    return `${API_BASE}/api/police/pending`;
  }

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(buildUrl());
      if (!res.ok) throw new Error('failed to load');
      const data = await res.json();
      setApps(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Police load error', err);
      setApps([]);
      setMessage('Failed to load police applications');
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
      const res = await fetch(`${API_BASE}/api/police/${id}`);
      if (!res.ok) throw new Error('not found');
      const data = await res.json();
      setSelected(data);
      setOfficerId('');
      setCertificateFile(null);
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
    if (!officerId) {
      setMessage('Officer ID is required to approve.');
      return;
    }
    setActionLoading(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append('officerId', officerId || '');
      form.append('note', note || '');
      if (certificateFile) form.append('certificateFile', certificateFile);

      const res = await fetch(`${API_BASE}/api/police/${id}/approve`, {
        method: 'POST',
        body: form
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({ error: 'fail' }));
        throw new Error(err.error || 'approve failed');
      }
      setMessage('Application approved.');
      await load();
      const refreshed = await (await fetch(`${API_BASE}/api/police/${id}`)).json().catch(()=>null);
      setSelected(refreshed);
    } catch (err) {
      console.error(err);
      setMessage(err.message || 'approve failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function decline(id) {
    if (!officerId) {
      setMessage('Officer ID is required to decline.');
      return;
    }
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/police/${id}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ by: officerId || 'police', reason: note || 'Declined by police' })
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({ error: 'fail' }));
        throw new Error(err.error || 'decline failed');
      }
      setMessage('Application declined.');
      await load();
      setSelected(null);
    } catch (err) {
      console.error(err);
      setMessage(err.message || 'decline failed');
    } finally {
      setActionLoading(false);
    }
  }

  const provinces = Array.from(new Set(apps.map(a => a.province).filter(Boolean))).sort();

  const filtered = apps
    .filter(a => {
      if (!search) return true;
      const q = search.toLowerCase();
      return String(a.id).includes(q)
        || (a.token && String(a.token).toLowerCase().includes(q))
        || (a.dealerName && a.dealerName.toLowerCase().includes(q))
        || (a.town && a.town.toLowerCase().includes(q))
        || (a.province && a.province.toLowerCase().includes(q));
    })
    .filter(a => (filterProvince ? a.province === filterProvince : true))
    .sort((x,y) => {
      if (sortBy === 'newest') return new Date(y.created_at || 0) - new Date(x.created_at || 0);
      if (sortBy === 'oldest') return new Date(x.created_at || 0) - new Date(y.created_at || 0);
      return 0;
    });

  return (
    <div style={{ display:'flex', gap:20, alignItems:'flex-start', padding:16 }}>
      <aside style={{
        width: 360,
        minHeight: 420,
        background: '#fff',
        borderRadius: 12,
        padding: 14,
        boxShadow: '0 8px 30px rgba(6,10,8,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:THEME.dark }}>Pending applications</div>
            <div style={{ fontSize:12, color:THEME.muted }}>{apps.length} total</div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={load} style={{ padding:'8px 10px', borderRadius:8, border:'1px solid rgba(0,0,0,0.06)', background:'#f6f7f6', cursor:'pointer' }}>
              Refresh
            </button>
          </div>
        </div>

        <div style={{ display:'flex', gap:8 }}>
          <input
            placeholder="Search by id, token, dealer, town..."
            value={search}
            onChange={e=>setSearch(e.target.value)}
            style={{ flex:1, padding:'8px 10px', borderRadius:8, border:'1px solid #e6e9e7' }}
          />
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ padding:'8px', borderRadius:8, border:'1px solid #e6e9e7' }}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>

        <div style={{ display:'flex', gap:8 }}>
          <select value={filterProvince} onChange={e=>setFilterProvince(e.target.value)} style={{ flex:1, padding:'8px', borderRadius:8, border:'1px solid #e6e9e7' }}>
            <option value="">All provinces</option>
            {provinces.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <button onClick={() => { setSearch(''); setFilterProvince(''); setSortBy('newest'); }} style={{ padding:'8px 10px', borderRadius:8, border:'1px solid rgba(0,0,0,0.04)', background:'#fff' }}>
            Clear
          </button>
        </div>

        <div style={{ flex:1, overflowY:'auto', paddingTop:4 }}>
          {loading && <div style={{ color:THEME.muted }}>Loading...</div>}
          {!loading && filtered.length === 0 && <div style={{ color:THEME.muted }}>No applications</div>}
          <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:8 }}>
            {filtered.map(a => {
              const isSel = selected && selected.id === a.id;
              return (
                <li key={a.id} style={{
                  borderRadius:10,
                  padding:10,
                  display:'flex',
                  justifyContent:'space-between',
                  alignItems:'center',
                  cursor:'pointer',
                  background: isSel ? 'linear-gradient(90deg, rgba(26,160,109,0.08), rgba(19,94,61,0.04))' : '#fbfdfc',
                  border: isSel ? `1px solid ${THEME.mid}` : '1px solid rgba(0,0,0,0.03)'
                }} onClick={() => viewApp(a.id)}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14 }}>ID {a.id} <span style={{ fontSize:12, fontWeight:500, color:THEME.muted }}>• {a.token}</span></div>
                    <div style={{ fontSize:12, color:THEME.muted }}>{a.province || '—'} / {a.town || '—'}</div>
                    <div style={{ fontSize:12, color:THEME.muted }}>Dealer: {a.dealerName || '—'}</div>
                  </div>
                  <div style={{ textAlign:'right', display:'flex', flexDirection:'column', gap:6 }}>
                    <div style={{ fontSize:12, color:THEME.muted }}>{a.created_at ? new Date(a.created_at).toLocaleDateString() : ''}</div>
                    <button
                      onClick={(ev) => { ev.stopPropagation(); viewApp(a.id); }}
                      style={{ padding:'6px 8px', borderRadius:8, background:'#fff', border:'1px solid rgba(0,0,0,0.04)', cursor:'pointer' }}
                    >
                      View
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div style={{ display:'flex', gap:8 }}>
          <div style={{ fontSize:12, color:THEME.muted, flex:1 }}>Last sync: {loading ? 'now' : (apps[0]?.created_at ? new Date(apps[0].created_at).toLocaleString() : '—')}</div>
          <div style={{ fontSize:12, color:THEME.muted }}>{apps.length}</div>
        </div>
      </aside>

      <section style={{ flex:1, minHeight:420 }}>
        {!selected && (
          <div style={{
            background: 'linear-gradient(180deg,#fff,#fbfdfc)',
            borderRadius:12,
            padding:20,
            boxShadow:'0 8px 30px rgba(6,10,8,0.06)'
          }}>
            <div style={{ fontSize:18, fontWeight:800, color:THEME.dark }}>Welcome — review applications</div>
            <div style={{ marginTop:8, color:THEME.muted }}>
              Select an application from the left to see details, open files, and approve or decline.
            </div>

            <div style={{ marginTop:16, display:'flex', gap:12 }}>
              <button onClick={load} style={{ padding:'10px 14px', borderRadius:10, background:THEME.mid, color:THEME.textOnDark, border:'none', cursor:'pointer' }}>
                Refresh list
              </button>
              <button onClick={() => { setSelected(null); setMessage(null); setOfficerId(''); setCertificateFile(null); setNote(''); }} style={{ padding:'10px 14px', borderRadius:10, background:'#fff', border:'1px solid rgba(0,0,0,0.04)', cursor:'pointer' }}>
                Reset
              </button>
            </div>
          </div>
        )}

        {selected && (
          <div style={{
            background:'#fff',
            borderRadius:12,
            padding:18,
            boxShadow:'0 8px 30px rgba(6,10,8,0.06)'
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:12 }}>
              <div>
                <div style={{ fontSize:18, fontWeight:800, color:THEME.dark }}>Application {selected.id}</div>
                <div style={{ color:THEME.muted, marginTop:6 }}>Token: {selected.token} • {selected.province || '—'} / {selected.town || '—'}</div>
              </div>

              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:12, color:THEME.muted }}>{selected.created_at ? new Date(selected.created_at).toLocaleString() : ''}</div>
                <button onClick={() => { setSelected(null); }} style={{ marginTop:8, padding:'6px 10px', borderRadius:8, border:'1px solid rgba(0,0,0,0.05)', background:'#fff', cursor:'pointer' }}>
                  Close
                </button>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns: '1fr 340px', gap:16, marginTop:16 }}>
              <div>
                <div style={{ padding:12, borderRadius:10, background:'#fbfbfb', border:'1px solid rgba(0,0,0,0.03)' }}>
                  <div style={{ marginBottom:8, fontWeight:700 }}>Applicant</div>
                  <div style={{ fontSize:13, color:THEME.muted }}>ID: {selected.applicantId || '—'}</div>
                  <div style={{ fontSize:13, color:THEME.muted }}>Dealer: {selected.dealerName || '—'}</div>
                  <div style={{ fontSize:13, color:THEME.muted }}>Hours practiced: {selected.hoursPracticed ?? '—'}</div>
                  <div style={{ fontSize:13, color:THEME.muted }}>Club member: {selected.isMember ? 'Yes' : 'No'}</div>
                </div>

                <div style={{ marginTop:12 }}>
                  <div style={{ fontWeight:700, marginBottom:8 }}>Files</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {selected.files?.file && (
                      <a href={fileUrl(selected.files.file)} target="_blank" rel="noreferrer" style={{ display:'inline-block', padding:'8px 12px', borderRadius:8, background:'#fff', border:'1px solid rgba(0,0,0,0.04)', textDecoration:'none', color:THEME.dark }}>
                        Open applicant file
                      </a>
                    )}
                    {selected.files?.endorsementFile && (
                      <a href={fileUrl(selected.files.endorsementFile)} target="_blank" rel="noreferrer" style={{ display:'inline-block', padding:'8px 12px', borderRadius:8, background:'#fff', border:'1px solid rgba(0,0,0,0.04)', textDecoration:'none', color:THEME.dark }}>
                        Open club endorsement
                      </a>
                    )}
                    {selected.files?.certificateFile && (
                      <a href={fileUrl(selected.files.certificateFile)} target="_blank" rel="noreferrer" style={{ display:'inline-block', padding:'8px 12px', borderRadius:8, background:'#fff', border:'1px solid rgba(0,0,0,0.04)', textDecoration:'none', color:THEME.dark }}>
                        Open certificate
                      </a>
                    )}
                    {!selected.files && <div style={{ color:THEME.muted }}>No files attached</div>}
                  </div>
                </div>

                <div style={{ marginTop:12 }}>
                  <div style={{ fontWeight:700, marginBottom:8 }}>Club note</div>
                  <div style={{ padding:12, borderRadius:8, background:'#fbfbfb', border:'1px solid rgba(0,0,0,0.03)' }}>{selected.note || '—'}</div>
                </div>
              </div>

              <aside style={{ background:'#fafaf9', padding:12, borderRadius:10, border:'1px solid rgba(0,0,0,0.03)' }}>
                <div style={{ fontWeight:700, marginBottom:8 }}>Action panel</div>

                <label style={{ fontSize:13, color:THEME.muted }}>Officer ID</label>
                <input
                  value={officerId}
                  onChange={e=>setOfficerId(e.target.value)}
                  placeholder="Your officer identifier"
                  style={{ width:'100%', padding:'8px 10px', marginTop:6, borderRadius:8, border:'1px solid #e6e9e7' }}
                />

                <label style={{ fontSize:13, color:THEME.muted, marginTop:12, display:'block' }}>Upload certificate (PDF)</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={e=>setCertificateFile(e.target.files?.[0] ?? null)}
                  style={{ width:'100%', marginTop:8 }}
                />
                {certificateFile && (
                  <div style={{ marginTop:8, fontSize:13, color:THEME.muted }}>
                    Selected: <strong>{certificateFile.name}</strong> ({bytesToSize(certificateFile.size)})
                  </div>
                )}

                <label style={{ fontSize:13, color:THEME.muted, marginTop:12, display:'block' }}>Note / Reason</label>
                <textarea value={note} onChange={e=>setNote(e.target.value)} rows={4} style={{ width:'100%', padding:10, marginTop:6, borderRadius:8, border:'1px solid #e6e9e7' }} />

                <div style={{ display:'flex', gap:8, marginTop:12 }}>
                  <button
                    onClick={() => approve(selected.id)}
                    disabled={actionLoading}
                    style={{
                      flex:1,
                      padding:'10px 12px',
                      borderRadius:10,
                      background:THEME.bright,
                      color:'#042019',
                      border:'none',
                      fontWeight:700,
                      cursor: actionLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {actionLoading ? 'Working...' : 'Approve'}
                  </button>

                  <button
                    onClick={() => decline(selected.id)}
                    disabled={actionLoading}
                    style={{
                      flex:1,
                      padding:'10px 12px',
                      borderRadius:10,
                      background:THEME.danger,
                      color:'#fff',
                      border:'none',
                      fontWeight:700,
                      cursor: actionLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {actionLoading ? 'Working...' : 'Decline'}
                  </button>
                </div>

                {message && <div style={{ marginTop:12, color:THEME.dark }}>{message}</div>}

                <div style={{ marginTop:14, fontSize:12, color:THEME.muted }}>
                  Tip: Fill the officer ID and optionally attach a certificate PDF before approving.
                </div>
              </aside>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

