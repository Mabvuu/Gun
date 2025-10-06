// frontend/src/Club/pages/View.jsx
import React, { useMemo, useState } from 'react';

const COLORS = {
  gold: '#DAA112',
  sage: '#809276',
  olive: '#666E51',
  deepTeal: '#10383A',
  slate: '#768886'
};

/**
 * View (simulated club records)
 * - Generates 50 simulated records (members / club records)
 * - Provides search, simple pagination, and a detail modal
 * - Uses small, clean typography and full-width rows
 *
 * Drop this file in place of your current View component.
 */

function makeRecords(count = 50) {
  const first = ['Thomas','Angela','Peter','Sandra','Kuda','Nomsa','Tendai','Brian','Mercy','David','Fiona','Leroy','Patricia','Simon','Rudo','Mandla','Anna','George','Chipo','Elias'];
  const last = ['Moyo','Chikore','Ndlovu','Mashingaidze','Chirwa','Dube','Mutasa','Gono','Mabena','Nyathi','Mpofu','Sibanda','Khumalo','Zhou','Mupasi','Ncube','Sithole','Mare','Chimedza','Mlambo'];
  const towns = ['Harare','Bulawayo','Kariba','Mutare','Victoria Falls','Gweru','Chinhoyi','Marondera','Kadoma','Kwekwe'];
  const activities = ['Rifle','Pistol','Clay target','Long-range','Tactical','Precision'];
  const statuses = ['Active','Expired','Suspended'];

  const recs = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const fn = first[i % first.length];
    const ln = last[(i * 7) % last.length];
    const name = `${fn} ${ln}`;
    const membershipNumber = `${['HMC','ZSG','KRC','SPA','LTC'][i % 5]}-${2020 + (i % 6)}-${String(i + 1).padStart(3, '0')}`;
    const joinedOffset = Math.floor(Math.random() * 2000); // days ago up to ~5.5 years
    const lastAttOffset = Math.floor(Math.random() * 30); // days ago up to 30
    const joinedAt = new Date(now - joinedOffset * 24 * 60 * 60 * 1000).toISOString().slice(0,10);
    const lastAttendance = new Date(now - lastAttOffset * 24 * 60 * 60 * 1000).toISOString().slice(0,10);
    const town = towns[(i * 3) % towns.length];
    const address = `${10 + i} ${['Range','River','Highveld','Lakeside','Hillcrest'][i % 5]} St, ${town}`;
    const phone = `+263 ${70 + (i % 30)} ${String(100000 + i).slice(-6)}`;
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@example.com`;
    const activity = activities[i % activities.length];
    const status = statuses[i % statuses.length];
    const notes = (i % 7 === 0) ? 'Needs orientation' : (i % 11 === 0) ? 'Instructor' : '';

    recs.push({
      id: `REC-${String(1000 + i)}`,
      name,
      membershipNumber,
      joinedAt,
      lastAttendance,
      activity,
      status,
      address,
      town,
      phone,
      email,
      notes
    });
  }
  return recs;
}

export default function View() {
  const SIM = useMemo(() => makeRecords(50), []);
  const [records] = useState(SIM);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    const qq = String(q || '').trim().toLowerCase();
    if (!qq) return records;
    return records.filter(r =>
      r.name.toLowerCase().includes(qq) ||
      r.membershipNumber.toLowerCase().includes(qq) ||
      (r.town || '').toLowerCase().includes(qq) ||
      (r.activity || '').toLowerCase().includes(qq)
    );
  }, [q, records]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);

  function gotoPage(n) {
    const next = Math.max(1, Math.min(totalPages, n));
    setPage(next);
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 18, margin: 0, color: '#0f172a' }}>Club Records</h1>
          <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.6)', marginTop: 6 }}>
            Simulated list of club members and records (showing {filtered.length} records).
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1); }}
            placeholder="Search name, membership #, town or activity"
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              border: `1px solid ${COLORS.slate}`,
              width: 360,
              fontSize: 13
            }}
          />
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 8px 30px rgba(16,56,58,0.04)', overflow: 'hidden' }}>
        {/* header row */}
        <div style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)', alignItems: 'center' }}>
          <div style={{ width: 48, fontSize: 12, color: 'rgba(0,0,0,0.6)' }}>#</div>
          <div style={{ flex: 1, fontSize: 12, color: 'rgba(0,0,0,0.6)' }}>Name</div>
          <div style={{ width: 160, fontSize: 12, color: 'rgba(0,0,0,0.6)' }}>Membership #</div>
          <div style={{ width: 120, fontSize: 12, color: 'rgba(0,0,0,0.6)' }}>Activity</div>
          <div style={{ width: 110, fontSize: 12, color: 'rgba(0,0,0,0.6)' }}>Last attendance</div>
          <div style={{ width: 100, textAlign: 'right', fontSize: 12, color: 'rgba(0,0,0,0.6)' }}>Actions</div>
        </div>

        {/* rows */}
        <div>
          {pageItems.map((r, idx) => (
            <div
              key={r.id}
              style={{
                display: 'flex',
                gap: 12,
                padding: '12px 16px',
                alignItems: 'center',
                borderBottom: '1px solid rgba(0,0,0,0.04)'
              }}
            >
              <div style={{ width: 48, fontSize: 13, color: '#111' }}>{(page - 1) * perPage + idx + 1}</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', marginTop: 4 }}>{r.address}</div>
              </div>

              <div style={{ width: 160, fontSize: 13, color: '#111' }}>{r.membershipNumber}</div>

              <div style={{ width: 120, fontSize: 13, color: 'rgba(0,0,0,0.8)' }}>{r.activity}</div>

              <div style={{ width: 110, fontSize: 13, color: 'rgba(0,0,0,0.7)' }}>{r.lastAttendance}</div>

              <div style={{ width: 100, textAlign: 'right' }}>
                <button
                  onClick={() => setSelected(r)}
                  style={{
                    background: COLORS.sage,
                    color: '#fff',
                    border: 'none',
                    padding: '6px 8px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 13
                  }}
                >
                  View
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* footer / pagination */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12 }}>
          <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.6)' }}>
            Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => gotoPage(page - 1)}
              disabled={page <= 1}
              style={page <= 1 ? disabledButtonStyle() : pageButtonStyle()}
            >
              Prev
            </button>

            {/* numeric pager (show up to totalPages, but only a small window) */}
            {Array.from({ length: totalPages }).map((_, i) => {
              const pNum = i + 1;
              // only render a small window around current page
              if (pNum < page - 2 || pNum > page + 2) return null;
              return (
                <button
                  key={pNum}
                  onClick={() => setPage(pNum)}
                  style={pNum === page ? activePageStyle() : pageButtonStyle()}
                >
                  {pNum}
                </button>
              );
            })}

            <button
              onClick={() => gotoPage(page + 1)}
              disabled={page >= totalPages}
              style={page >= totalPages ? disabledButtonStyle() : pageButtonStyle()}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* detail modal */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(4,6,8,0.45)'
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 10, padding: 18, width: 'min(860px, 94vw)', boxShadow: '0 12px 40px rgba(16,56,58,0.12)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ color: COLORS.deepTeal, fontSize: 16, marginBottom: 6 }}>{selected.name}</div>
                <div style={{ color: '#444', fontSize: 13 }}>{selected.membershipNumber}</div>
                <div style={{ color: '#666', fontSize: 13, marginTop: 8 }}>{selected.address}</div>

                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ fontSize: 13 }}><span style={{ fontWeight: 600 }}>Activity:</span> <span style={{ fontWeight: 400 }}>{selected.activity}</span></div>
                  <div style={{ fontSize: 13 }}><span style={{ fontWeight: 600 }}>Status:</span> <span style={{ fontWeight: 400 }}>{selected.status}</span></div>
                  <div style={{ fontSize: 13 }}><span style={{ fontWeight: 600 }}>Joined:</span> <span style={{ fontWeight: 400 }}>{selected.joinedAt}</span></div>
                  <div style={{ fontSize: 13 }}><span style={{ fontWeight: 600 }}>Last attendance:</span> <span style={{ fontWeight: 400 }}>{selected.lastAttendance}</span></div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ fontSize: 13, color: '#444' }}>{selected.email}</div>
                <div style={{ fontSize: 13, color: '#444' }}>{selected.phone}</div>

                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => { navigator.clipboard?.writeText(selected.email); }} style={{ padding: '8px 10px', borderRadius: 8, border: 'none', background: COLORS.gold, cursor: 'pointer' }}>Email</button>
                  <button onClick={() => { navigator.clipboard?.writeText(selected.phone); }} style={{ padding: '8px 10px', borderRadius: 8, border: 'none', background: COLORS.slate, color: '#fff', cursor: 'pointer' }}>Copy phone</button>
                </div>
                <button onClick={() => setSelected(null)} style={{ padding: '8px 10px', borderRadius: 8, border: 'none', background: COLORS.olive, color: '#fff', cursor: 'pointer' }}>Close</button>
              </div>
            </div>

            {selected.notes && (
              <div style={{ marginTop: 14, color: '#666', fontSize: 13 }}>
                <div style={{ fontSize: 13, color: '#444', marginBottom: 6 }}>Notes</div>
                <div>{selected.notes}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- small helpers ---------- */

function pageButtonStyle() {
  return {
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.06)',
    background: '#fff',
    cursor: 'pointer',
    fontSize: 13
  };
}

function activePageStyle() {
  return {
    padding: '6px 10px',
    borderRadius: 8,
    border: 'none',
    background: '#0f766e',
    color: '#fff',
    cursor: 'default',
    fontSize: 13
  };
}

function disabledButtonStyle() {
  return {
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.04)',
    background: '#f3f4f6',
    color: 'rgba(0,0,0,0.35)',
    cursor: 'not-allowed',
    fontSize: 13
  };
}
