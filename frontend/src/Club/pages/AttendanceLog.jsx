// frontend/src/Club/pages/AttendanceLog.jsx
import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';

const COLORS = {
  gold: '#DAA112',
  sage: '#809276',
  olive: '#666E51',
  deepTeal: '#10383A',
  slate: '#768886',
  subtle: 'rgba(16,56,58,0.04)'
};

/* Simulated members (same as used elsewhere) */
const SIMULATED_MEMBERS = [
  {
    id: 'M-001',
    firstName: 'Thomas',
    lastName: 'Moyo',
    address: '12 Range Road, Harare',
    membershipNumber: 'HMC-2024-001',
    joinedAt: '2021-05-12',
    phone: '+263 77 123 4567',
    email: 'thomas.moyo@example.com',
    activity: 'Rifle, Clay target',
    notes: 'Prefers morning range sessions. Safety certified.'
  },
  {
    id: 'M-002',
    firstName: 'Angela',
    lastName: 'Chikore',
    address: '34 Bulawayo Lane, Bulawayo',
    membershipNumber: 'ZSG-2023-007',
    joinedAt: '2019-08-30',
    phone: '+263 78 234 9876',
    email: 'angela.chikore@example.com',
    activity: 'Pistol, Precision',
    notes: 'Instructor, available weekends.'
  },
  {
    id: 'M-003',
    firstName: 'Peter',
    lastName: 'Ndlovu',
    address: '7 Kariba Drive, Kariba',
    membershipNumber: 'KRC-2025-012',
    joinedAt: '2022-11-02',
    phone: '+263 71 555 1212',
    email: 'peter.ndlovu@example.com',
    activity: 'Tactical',
    notes: 'New member — needs orientation.'
  },
  {
    id: 'M-004',
    firstName: 'Sandra',
    lastName: 'Mashingaidze',
    address: '99 Highveld Ave, Mutare',
    membershipNumber: 'SPA-2020-045',
    joinedAt: '2020-02-14',
    phone: '+263 73 444 8899',
    email: 'sandra.m@example.com',
    activity: 'Long-range',
    notes: 'Competes regionally.'
  },
  {
    id: 'M-005',
    firstName: 'Kuda',
    lastName: 'Chirwa',
    address: '5 Lakeside Court, Victoria Falls',
    membershipNumber: 'LTC-2021-033',
    joinedAt: '2021-07-20',
    phone: '+263 79 998 7766',
    email: 'kuda.chirwa@example.com',
    activity: 'Rifle',
    notes: 'Volunteer marshal.'
  }
];

/* Utility to build simulated attendance entries */
function makeSimulatedEntries(count = 12) {
  const entries = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const member = SIMULATED_MEMBERS[i % SIMULATED_MEMBERS.length];
    // distribute over last 10 days
    const daysAgo = Math.floor(Math.random() * 10);
    const d = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
    // format YYYY-MM-DD
    const isoDate = d.toISOString().slice(0, 10);
    entries.push({
      id: `sim-${String(Math.random()).slice(2, 10)}-${i}`,
      memberId: member.membershipNumber,
      memberName: `${member.firstName} ${member.lastName}`,
      date: isoDate,
      notes: (Math.random() > 0.7) ? 'Evening session' : 'Range session'
    });
  }
  // sort newest first
  return entries.sort((a, b) => (b.date || '').localeCompare(a.date));
}

export default function AttendanceLog() {
  const [entries, setEntries] = useState([]);
  const [date, setDate] = useState('');
  const [memberId, setMemberId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [query, setQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [showOnlyToday, setShowOnlyToday] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    axios.get('/api/sportsclub/attendance')
      .then(res => {
        if (!mounted) return;
        const data = Array.isArray(res.data) ? res.data : [];
        if (data.length === 0) {
          // server empty -> provide simulated entries
          const sim = makeSimulatedEntries(12);
          setEntries(sim);
          setMsg('Loaded simulated attendance (no server data)');
          setTimeout(() => setMsg(null), 2200);
        } else {
          setEntries(data);
        }
      })
      .catch(err => {
        console.error(err);
        if (mounted) {
          // if server fails, seed with simulated entries so UI is usable
          const sim = makeSimulatedEntries(12);
          setEntries(sim);
          setMsg('Loaded simulated attendance (offline)');
          setTimeout(() => setMsg(null), 2200);
        }
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const addEntry = async () => {
    if (!memberId.trim()) return setMsg('Member ID required');
    if (!date) return setMsg('Date is required');
    setSaving(true);
    setMsg(null);

    try {
      const payload = { memberId: memberId.trim(), date };
      const res = await axios.post('/api/sportsclub/attendance', payload);
      const newEntry = res?.data || { id: `local-${Date.now()}`, ...payload, memberName: null, notes: '' };
      setEntries(prev => [newEntry, ...prev]);
      setMemberId('');
      setDate('');
      setMsg('Attendance added');
      // gentle auto-dismiss
      setTimeout(() => setMsg(null), 2500);
    } catch (err) {
      console.error(err);
      // if server failing, add a local simulated entry with memberName if match in simulated members
      const member = SIMULATED_MEMBERS.find(m => m.membershipNumber === memberId.trim());
      const fallback = {
        id: `local-${Date.now()}`,
        memberId: memberId.trim(),
        memberName: member ? `${member.firstName} ${member.lastName}` : null,
        date,
        notes: ''
      };
      setEntries(prev => [fallback, ...prev]);
      setMsg('Offline — added locally');
      setTimeout(() => setMsg(null), 2200);
    } finally {
      setSaving(false);
    }
  };

  const removeEntry = async (id) => {
    if (!confirm('Delete this attendance entry?')) return;
    try {
      await axios.delete(`/api/sportsclub/attendance/${encodeURIComponent(id)}`);
      setEntries(prev => prev.filter(e => e.id !== id));
      setMsg('Deleted');
      setTimeout(() => setMsg(null), 2000);
    } catch (err) {
      console.error(err);
      // if server delete fails for simulated/local, remove locally
      setEntries(prev => prev.filter(e => e.id !== id));
      setMsg('Deleted locally');
      setTimeout(() => setMsg(null), 2000);
    }
  };

  const downloadCSV = () => {
    if (!entries.length) return setMsg('No entries to export');
    const header = ['id','memberId','memberName','date','notes'];
    const rows = entries.map(e => [
      e.id,
      `"${String(e.memberId ?? '').replace(/"/g,'""')}"`,
      `"${String(e.memberName ?? '').replace(/"/g,'""')}"`,
      e.date,
      `"${String(e.notes ?? '').replace(/"/g,'""')}"` 
    ].join(','));
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    let list = entries;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(e =>
        String(e.memberId ?? '').toLowerCase().includes(q) ||
        String(e.memberName ?? '').toLowerCase().includes(q) ||
        String(e.notes ?? '').toLowerCase().includes(q)
      );
    }
    if (filterDate) list = list.filter(e => (e.date || '').startsWith(filterDate));
    if (showOnlyToday) {
      const today = new Date().toISOString().slice(0,10);
      list = list.filter(e => (e.date || '').startsWith(today));
    }
    return list;
  }, [entries, query, filterDate, showOnlyToday]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Attendance Log</h1>
          <p className="text-sm text-[rgba(0,0,0,0.6)] mt-1">
            Track club attendance. Use quick filters, export CSV, or add entries here.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={downloadCSV}
            className="px-3 py-2 rounded-md font-medium"
            style={{ background: COLORS.slate, color: 'white' }}
            title="Export visible entries to CSV"
          >
            Export CSV
          </button>
          <button
            onClick={() => { setEntries([]); setMsg('Cleared (local view)'); setTimeout(()=>setMsg(null),1500); }}
            className="px-3 py-2 rounded-md font-medium"
            style={{ background: COLORS.deepTeal, color: 'white' }}
            title="Clear list (local)"
          >
            Clear
          </button>
        </div>
      </div>

      {/* add entry card */}
      <div className="bg-white rounded-lg p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div>
          <label className="block text-sm font-medium">Member ID</label>
          <input
            value={memberId}
            onChange={e => setMemberId(e.target.value)}
            placeholder="e.g. M-001 or HMC-2024-001"
            className="mt-1 px-3 py-2 rounded-md w-full"
            style={{ border: `1px solid ${COLORS.slate}` }}
            disabled={saving}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="mt-1 px-3 py-2 rounded-md w-full"
            style={{ border: `1px solid ${COLORS.slate}` }}
            disabled={saving}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={addEntry}
            disabled={saving}
            className="px-4 py-2 rounded-md font-semibold"
            style={{
              background: COLORS.gold,
              color: '#000',
              boxShadow: '0 8px 24px rgba(218,161,18,0.12)'
            }}
          >
            {saving ? 'Adding…' : 'Add Attendance'}
          </button>

          <button
            onClick={() => { setMemberId(''); setDate(''); }}
            disabled={saving}
            className="px-3 py-2 rounded-md"
            style={{ background: '#f3f4f6' }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* filters */}
      <div className="bg-white rounded-lg p-3 shadow-sm flex flex-col md:flex-row gap-3 items-center">
        <input
          value={query}
          onChange={e=>setQuery(e.target.value)}
          placeholder="Search member id, name or notes"
          className="px-3 py-2 rounded-md w-full md:w-1/2"
          style={{ border: `1px solid ${COLORS.slate}` }}
        />
        <input
          type="date"
          value={filterDate}
          onChange={e=>setFilterDate(e.target.value)}
          className="px-3 py-2 rounded-md"
          style={{ border: `1px solid ${COLORS.slate}` }}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showOnlyToday} onChange={e=>setShowOnlyToday(e.target.checked)} />
          <span>Only today</span>
        </label>
        <div className="ml-auto text-sm text-[rgba(0,0,0,0.6)]">{filtered.length} shown</div>
      </div>

      {/* message / toast */}
      {msg && (
        <div className="rounded-md p-3 text-sm" style={{ background: COLORS.subtle }}>
          {msg}
        </div>
      )}

      {/* list */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Recent Attendance</h2>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-14 rounded-md bg-[rgba(0,0,0,0.04)] animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-sm text-[rgba(0,0,0,0.6)]">No attendance yet.</div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((e) => (
              <li key={e.id} className="p-3 rounded-lg flex items-center gap-3 border" style={{ borderColor: COLORS.subtle }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: COLORS.subtle,
                    fontSize: 18,
                    flexShrink: 0
                  }}
                  aria-hidden
                >
                  {avatarInitials(e.memberName || e.memberId)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-medium truncate">{e.memberName || e.memberId}</div>
                    <div className="text-xs text-[rgba(0,0,0,0.55)]">#{e.memberId}</div>
                  </div>
                  <div className="text-sm text-[rgba(0,0,0,0.6)] mt-1">{formatDate(e.date)}</div>
                </div>

                <div className="ml-auto text-sm text-[rgba(0,0,0,0.6)]">{e.notes}</div>

                <div>
                  <button
                    onClick={() => removeEntry(e.id)}
                    className="ml-3 px-2 py-1 rounded-md text-sm"
                    style={{ background: COLORS.olive, color: 'white' }}
                    title="Delete entry"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ---------- small helpers ---------- */

function formatDate(d) {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString();
  } catch {
    return d;
  }
}

function avatarInitials(name) {
  if (!name) return '👤';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
