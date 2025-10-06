// frontend/src/PoliceStation/pages/Inspections.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const THEME = {
  darkest: '#09110D',
  dark: '#0B3221',
  mid: '#135E3D',
  bright: '#1AA06D',
  textOnDark: '#E8F8F5',
  muted: '#7b8f8a',
  danger: '#C94A45'
};

function formatDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function monthKey(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  } catch {
    return 'Unknown';
  }
}

// Simulated dataset — clearly labelled and used when no server/snapshot is available
const SIMULATED_INSPECTIONS = [
  {
    id: 'sim-1001',
    applicationId: 'A-2356',
    inspector: 'Inspector Nyathi',
    result: 'Successful',
    timestamp: new Date().toISOString(),
    notes: 'All checks passed. Firearms securely stored.',
    signatureUrl: ''
  },
  {
    id: 'sim-1002',
    applicationId: 'A-2348',
    inspector: 'Inspector Moyo',
    result: 'Declined',
    timestamp: new Date(Date.now() - 1000*60*60*24*5).toISOString(),
    notes: 'Paperwork incomplete; recommended resubmission with proof of residence.',
    signatureUrl: ''
  },
  {
    id: 'sim-0901',
    applicationId: 'A-2020',
    inspector: 'Inspector Dube',
    result: 'Successful',
    timestamp: new Date(Date.now() - 1000*60*60*24*35).toISOString(),
    notes: 'Minor issues fixed on-site.',
    signatureUrl: ''
  },
  {
    id: 'sim-0801',
    applicationId: 'A-1999',
    inspector: 'Inspector Ndlovu',
    result: 'Declined',
    timestamp: new Date(Date.now() - 1000*60*60*24*65).toISOString(),
    notes: 'Failed safety demonstration.',
    signatureUrl: ''
  },
  {
    id: 'sim-0802',
    applicationId: 'A-1877',
    inspector: 'Inspector Moyo',
    result: 'Successful',
    timestamp: new Date(Date.now() - 1000*60*60*24*70).toISOString(),
    notes: 'Good to proceed.',
    signatureUrl: ''
  }
];

export default function Inspections() {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [selected, setSelected] = useState(null);
  const [isSimulated, setIsSimulated] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setMessage('');
      setIsSimulated(false);
      try {
        const res = await fetch('/api/police/inspections');
        if (!res.ok) throw new Error('no-server');
        const data = await res.json();
        if (mounted) setInspections(Array.isArray(data) ? data : []);
      } catch {
        const raw = localStorage.getItem('inspections_snapshot');
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (mounted) setInspections(Array.isArray(parsed) ? parsed : []);
            setMessage('Loaded inspections from local snapshot (no server).');
          } catch {
            if (mounted) {
              setInspections(SIMULATED_INSPECTIONS);
              setMessage('Could not load server/snapshot — using simulated inspections for demo.');
              setIsSimulated(true);
            }
          }
        } else {
          if (mounted) {
            setInspections(SIMULATED_INSPECTIONS);
            setMessage('No server/snapshot — using simulated inspections for demo.');
            setIsSimulated(true);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const filtered = inspections
    .filter(i => {
      if (!search) return true;
      const q = search.toLowerCase();
      return String(i.applicationId).toLowerCase().includes(q)
        || (i.inspector && i.inspector.toLowerCase().includes(q))
        || (i.result && i.result.toLowerCase().includes(q))
        || (i.notes && i.notes.toLowerCase().includes(q));
    })
    .sort((a,b) => {
      if (sort === 'newest') return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
      if (sort === 'oldest') return new Date(a.timestamp || 0) - new Date(b.timestamp || 0);
      return 0;
    });

  const grouped = filtered.reduce((acc, rec) => {
    const key = rec.timestamp ? monthKey(rec.timestamp) : 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(rec);
    return acc;
  }, {});

  const groupedKeys = Object.keys(grouped).sort((a,b) => {
    const pa = new Date(grouped[a][0]?.timestamp || 0);
    const pb = new Date(grouped[b][0]?.timestamp || 0);
    return pb - pa;
  });

  function exportCSV() {
    if (!inspections || inspections.length === 0) {
      setMessage('Nothing to export.');
      return;
    }
    const header = ['id','applicationId','inspector','result','timestamp','notes'];
    const rows = inspections.map(r => [
      r.id ?? '',
      r.applicationId ?? '',
      r.inspector ?? '',
      r.result ?? '',
      r.timestamp ?? '',
      (r.notes || '').replace(/\n/g, ' ').replace(/"/g, '""')
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c)}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inspections_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // used in-list and in-details; defined once to avoid ESLint unused var
  const badgeStyle = (result) => {
    const success = /success/i.test(result);
    return {
      padding: '6px 12px',
      borderRadius: 999,
      fontSize: 13,
      fontWeight: 800,
      color: success ? THEME.textOnDark : '#fff',
      background: success ? THEME.bright : THEME.danger,
      display: 'inline-block',
      minWidth: 96,
      textAlign: 'center'
    };
  };

  return (
    <div style={{
      minHeight: '100%',
      padding: 22,
      boxSizing: 'border-box',
      fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto',
      background: THEME.darkest,
      color: THEME.textOnDark
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, color: THEME.bright }}>Inspections</div>
          <div style={{ color: THEME.textOnDark, opacity: 0.9, marginTop: 4 }}>Past inspection records — grouped by month</div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            placeholder="Search by application, inspector, result..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: '10px 12px',
              borderRadius: 12,
              border: 'none',
              minWidth: 300,
              fontSize: 14,
              background: '#f7fdf9',
              color: THEME.dark
            }}
          />
          <select value={sort} onChange={e => setSort(e.target.value)} style={{ padding: '10px 12px', borderRadius: 10, border: 'none', fontSize: 14 }}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
          <button onClick={exportCSV} style={{ padding: '10px 14px', borderRadius: 12, background: THEME.mid, color: THEME.textOnDark, border: 'none', cursor: 'pointer', fontWeight: 800 }}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Simulated banner */}
      {isSimulated && (
        <div style={{
          marginBottom: 12,
          padding: 12,
          borderRadius: 10,
          background: '#fff7e6',
          color: THEME.dark,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontWeight: 800 }}>SIMULATED DATA — demo only</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ color: THEME.muted }}>This view contains fake records for UI/demo purposes.</div>
            <button onClick={() => {
              // attempt to reload from server (user may be testing)
              setMessage('Attempting to reload real data...');
              setLoading(true);
              setIsSimulated(false);
              fetch('/api/police/inspections').then(r => {
                if (!r.ok) throw new Error('no-server');
                return r.json();
              }).then(d => {
                setInspections(Array.isArray(d) ? d : []);
                setMessage('Reloaded real data (server responded).');
              }).catch(() => {
                setInspections(SIMULATED_INSPECTIONS);
                setIsSimulated(true);
                setMessage('Server still unavailable — continuing with simulated data.');
              }).finally(() => setLoading(false));
            }} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)', background: THEME.textOnDark, color: THEME.dark, cursor: 'pointer', fontWeight: 800 }}>
              Retry server
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{
          background: '#fff',
          color: THEME.dark,
          borderRadius: 14,
          padding: 28,
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
        }}>
          Loading inspections...
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '360px 1fr',
          gap: 20,
          alignItems: 'start'
        }}>
          {/* Left column: records list */}
          <aside style={{
            background: THEME.textOnDark,
            color: THEME.dark,
            borderRadius: 14,
            padding: 16,
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            maxHeight: '78vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 900, fontSize: 16, color: THEME.dark }}>Records <span style={{ fontWeight: 700, color: THEME.muted, marginLeft: 8 }}>({filtered.length})</span></div>
              <div style={{ fontSize: 12, color: THEME.muted }}>Grouped by month</div>
            </div>

            {groupedKeys.length === 0 && <div style={{ color: THEME.muted }}>No inspection records match.</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {groupedKeys.map(month => (
                <div key={month} style={{ borderTop: '1px solid rgba(11,50,33,0.06)', paddingTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontWeight: 800, color: THEME.dark }}>{month}</div>
                    <div style={{ fontSize: 12, color: THEME.muted }}>{grouped[month].length} items</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {grouped[month].map(rec => (
                      <button
                        key={rec.id}
                        onClick={() => setSelected(rec)}
                        style={{
                          textAlign: 'left',
                          border: selected?.id === rec.id ? `2px solid ${THEME.mid}` : '1px solid rgba(11,50,33,0.06)',
                          background: '#fff',
                          padding: 12,
                          borderRadius: 10,
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12,
                          color: THEME.dark
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rec.inspector || 'Unknown inspector'}</div>
                          <div style={{ fontSize: 13, color: THEME.muted, marginTop: 6 }}>
                            App #{rec.applicationId} • <span style={{ color: /success/i.test(rec.result) ? THEME.mid : THEME.danger, fontWeight: 800 }}>{rec.result}</span>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 13, color: THEME.muted }}>{rec.timestamp ? new Date(rec.timestamp).toLocaleDateString() : '—'}</div>
                          <div style={{ marginTop: 8 }}>{/* badge */}<span style={badgeStyle(rec.result)}>{rec.result}</span></div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 14, fontSize: 13, color: THEME.muted }}>
              <div style={{ fontWeight: 800, color: THEME.dark, marginBottom: 8 }}>Legend</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ ...badgeStyle('Successful'), width: 110 }}>Successful</div>
                <div style={{ ...badgeStyle('Declined'), width: 110 }}>Declined</div>
              </div>
            </div>

            {message && <div style={{ marginTop: 14, color: THEME.danger, fontWeight: 700 }}>{message}</div>}
          </aside>

          {/* Main content: details */}
          <main style={{
            background: '#fff',
            color: THEME.dark,
            borderRadius: 14,
            padding: 22,
            boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
            maxHeight: '78vh',
            overflowY: 'auto'
          }}>
            {!selected ? (
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: THEME.dark }}>Select a record to view details</div>
                <div style={{ marginTop: 10, color: THEME.muted }}>Click any record on the left to inspect notes, signature and meta information.</div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: THEME.mid }}>{selected.result ?? 'Inspection'}</div>
                    <div style={{ color: THEME.muted, marginTop: 8, fontSize: 15 }}>
                      Inspector: <strong style={{ color: THEME.dark }}>{selected.inspector ?? '—'}</strong>
                    </div>
                    <div style={{ color: THEME.muted, marginTop: 8, fontSize: 15 }}>
                      Application: <Link to={`/police/application/${selected.applicationId}`} style={{ color: THEME.mid, textDecoration: 'none', fontWeight: 800 }}>#{selected.applicationId}</Link>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, color: THEME.muted }}>{formatDate(selected.timestamp)}</div>
                    <button onClick={() => setSelected(null)} style={{ marginTop: 10, padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.06)', background: THEME.textOnDark, color: THEME.dark, cursor: 'pointer', fontWeight: 800 }}>
                      Close
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
                  <section>
                    <div style={{ fontWeight: 900, marginBottom: 10, fontSize: 15 }}>Notes</div>
                    <div style={{ padding: 16, background: '#fbfbfb', borderRadius: 10, border: '1px solid rgba(0,0,0,0.04)', color: THEME.dark }}>
                      {selected.notes ?? <span style={{ color: THEME.muted }}>No notes provided.</span>}
                    </div>

                    <div style={{ marginTop: 18 }}>
                      {selected.signatureUrl ? (
                        <>
                          <div style={{ fontWeight: 900, marginBottom: 10, fontSize: 15 }}>Signature</div>
                          <img src={selected.signatureUrl} alt="signature" style={{ width: '100%', borderRadius: 10, border: '1px solid rgba(0,0,0,0.04)' }} />
                        </>
                      ) : (
                        <div style={{ marginTop: 12, color: THEME.muted }}>No signature attached.</div>
                      )}
                    </div>
                  </section>

                  <aside style={{ background: '#fff7f3', padding: 16, borderRadius: 10, border: '1px solid rgba(0,0,0,0.03)' }}>
                    <div style={{ fontWeight: 900, marginBottom: 12 }}>Meta</div>

                    <div style={{ fontSize: 13, color: THEME.muted }}>Record ID</div>
                    <div style={{ marginBottom: 10, fontWeight: 800 }}>{selected.id}</div>

                    <div style={{ fontSize: 13, color: THEME.muted }}>Inspector</div>
                    <div style={{ marginBottom: 10, fontWeight: 800 }}>{selected.inspector ?? '—'}</div>

                    <div style={{ fontSize: 13, color: THEME.muted }}>Result</div>
                    <div style={{ marginBottom: 10 }}>{/* badge */}<span style={badgeStyle(selected.result)}>{selected.result}</span></div>

                    <div style={{ fontSize: 13, color: THEME.muted }}>Timestamp</div>
                    <div style={{ marginBottom: 10 }}>{formatDate(selected.timestamp)}</div>

                    <div style={{ marginTop: 12 }}>
                      <button onClick={() => {
                        const link = `${window.location.origin}/police/application/${selected.applicationId}`;
                        navigator.clipboard?.writeText(link).then(() => setMessage('Application link copied to clipboard.'));
                      }} style={{ padding: '10px 12px', borderRadius: 10, width: '100%', background: THEME.mid, color: THEME.textOnDark, border: 'none', cursor: 'pointer', fontWeight: 900 }}>
                        Copy application link
                      </button>
                    </div>
                  </aside>
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
