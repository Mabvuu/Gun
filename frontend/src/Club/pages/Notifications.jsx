// frontend/src/Club/pages/Notifications.jsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';

const COLORS = {
  gold: '#DAA112',
  sage: '#809276',
  olive: '#666E51',
  deepTeal: '#10383A',
  slate: '#768886',
  subtle: 'rgba(16,56,58,0.04)'
};

/* Simulated members (same names used elsewhere) */
const SIM_MEMBERS = [
  { id: 'M-001', name: 'Thomas Moyo' },
  { id: 'M-002', name: 'Angela Chikore' },
  { id: 'M-003', name: 'Peter Ndlovu' },
  { id: 'M-004', name: 'Sandra Mashingaidze' },
  { id: 'M-005', name: 'Kuda Chirwa' }
];

/* Utility: generate a set of fake notifications */
function makeSimulatedNotes(count = 12) {
  const titles = [
    'Range booking confirmed',
    'New membership uploaded',
    'Safety course reminder',
    'Match results published',
    'Endorsement forwarded',
    'Equipment maintenance',
    'Course full — waitlist',
    'Club meeting tonight',
    'Subscription expiring',
    'New announcement'
  ];

  const messages = [
    'Your morning booking is confirmed. See you on the range.',
    'A document has been attached to an application — please review.',
    'Reminder: Safety course this Saturday at 09:00.',
    'Results for last weekend are now available in the portal.',
    'An endorsement was sent to the police for application #SIM-2025-XYZ.',
    'The 300m range will be closed for maintenance tomorrow.',
    'The course is full. You are on the waitlist and will be notified.',
    'Quick reminder: members meeting tonight at 18:30 in the clubhouse.',
    'Your subscription is due in 7 days. Renew to remain active.',
    'Important announcement: changes to range rules effective Monday.'
  ];

  const icons = ['🔔','📢','✅','📄','⚠️','🛠️','📅','🏆','🔒','✉️'];

  const now = Date.now();
  const notes = [];
  for (let i = 0; i < count; i++) {
    const idx = i % titles.length;
    const member = SIM_MEMBERS[i % SIM_MEMBERS.length];
    const minutesAgo = Math.floor(Math.random() * 60 * 24 * 6); // up to ~6 days
    const ts = new Date(now - minutesAgo * 60 * 1000).toISOString();
    notes.push({
      id: `sim-note-${String(Math.random()).slice(2, 10)}-${i}`,
      title: `${titles[idx]}${Math.random() > 0.7 ? ` — ${member.name}` : ''}`,
      message: messages[idx],
      timestamp: ts,
      icon: icons[idx],
      read: Math.random() > 0.6 // some read, some unread
    });
  }
  // newest first
  notes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return notes;
}

/* Occasionally create a single new simulated note (for silent refreshes) */
function makeOneSimulatedNote() {
  const pool = [
    { title: 'New booking available', message: 'A midday slot opened up — grab it fast.', icon: '📅' },
    { title: 'Member upload', message: 'A new membership letter was attached.', icon: '📄' },
    { title: 'Safety check', message: 'Safety inspection scheduled for tomorrow.', icon: '⚠️' },
    { title: 'Match reminder', message: 'Don\'t forget the match this weekend.', icon: '🏆' },
    { title: 'System notice', message: 'Portal will undergo maintenance at 02:00.', icon: '🛠️' }
  ];
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return {
    id: `sim-note-${String(Math.random()).slice(2, 10)}`,
    title: pick.title,
    message: pick.message,
    timestamp: new Date().toISOString(),
    icon: pick.icon,
    read: false
  };
}

export default function Notifications() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | unread | read
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState(null);
  const mountedRef = useRef(true);
  const intervalRef = useRef(null);

  const fetchNotes = useCallback(async (opts = {}) => {
    if (!mountedRef.current) return;
    if (!opts.silent) setLoading(true);
    try {
      const res = await axios.get('/api/sportsclub/notifications');
      if (!mountedRef.current) return;
      const serverData = Array.isArray(res.data) ? res.data.map(n => ({ ...n, timestamp: n.timestamp || n.createdAt || new Date().toISOString() })) : [];
      if (serverData.length === 0) {
        // server returned no data — use simulated notes
        if (opts.silent) {
          // on silent refresh, randomly add one new simulated note to mimic real-time
          if (Math.random() > 0.7) {
            setNotes(prev => {
              const newNote = makeOneSimulatedNote();
              return [newNote, ...prev].slice(0, 200);
            });
          }
        } else {
          const simulated = makeSimulatedNotes(14);
          setNotes(simulated);
        }
      } else {
        // server has data — merge while keeping UI consistent (newest first)
        setNotes(serverData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      }
    } catch (err) {
      console.error('fetchNotes', err);
      // offline/failure: seed simulated data so UI isn't empty
      if (opts.silent) {
        // on silent errors maybe add a tiny note occasionally
        if (Math.random() > 0.8) {
          setNotes(prev => [makeOneSimulatedNote(), ...prev].slice(0, 200));
        }
      } else {
        const simulated = makeSimulatedNotes(14);
        setNotes(simulated);
        setToast('Showing simulated notifications (offline)');
        setTimeout(() => setToast(null), 2200);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchNotes();
    // periodic silent refresh to simulate realtime updates
    intervalRef.current = setInterval(() => fetchNotes({ silent: true }), 15000);
    return () => {
      mountedRef.current = false;
      clearInterval(intervalRef.current);
    };
  }, [fetchNotes]);

  const markRead = async (id) => {
    const before = notes;
    setNotes(prev => prev.map(n => (n.id === id ? { ...n, _read: true } : n)));
    try {
      await axios.post(`/api/sportsclub/notifications/${id}/read`);
      setToast('Marked read');
      setTimeout(() => setToast(null), 1800);
    } catch (err) {
      console.error(err);
      setNotes(before);
      setToast('Could not mark as read');
      setTimeout(() => setToast(null), 2400);
    }
  };

  const markAllRead = async () => {
    const unread = notes.filter(n => !n._read && !n.read);
    if (!unread.length) {
      setToast('No unread notifications');
      setTimeout(() => setToast(null), 1400);
      return;
    }

    const before = notes;
    setNotes(prev => prev.map(n => ({ ...n, _read: true })));
    try {
      await axios.post('/api/sportsclub/notifications/read-all');
      setToast('All marked read');
      setTimeout(() => setToast(null), 1600);
    } catch (err) {
      console.error(err);
      setNotes(before);
      setToast('Could not mark all');
      setTimeout(() => setToast(null), 2400);
    }
  };

  const dismiss = async (id) => {
    const before = notes;
    setNotes(prev => prev.filter(n => n.id !== id));
    try {
      await axios.delete(`/api/sportsclub/notifications/${id}`);
      setToast('Notification deleted');
      setTimeout(() => setToast(null), 1400);
    } catch (err) {
      console.error(err);
      setNotes(before);
      setToast('Could not delete');
      setTimeout(() => setToast(null), 2400);
    }
  };

  const filtered = notes
    .filter(n => {
      if (filter === 'unread') return !(n.read || n._read);
      if (filter === 'read') return (n.read || n._read);
      return true;
    })
    .filter(n => {
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return String(n.title || '').toLowerCase().includes(q) || String(n.message || '').toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-sm text-[rgba(0,0,0,0.6)] mt-1">Realtime-ish updates. Important items show first.</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search title or message"
            className="px-3 py-2 rounded-md"
            style={{ border: `1px solid ${COLORS.slate}` }}
          />

          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="px-3 py-2 rounded-md"
            style={{ border: `1px solid ${COLORS.slate}` }}
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>

          <button
            onClick={markAllRead}
            className="px-3 py-2 rounded-md font-medium"
            style={{ background: COLORS.gold, color: '#000' }}
            title="Mark all as read"
          >
            Mark all
          </button>

          <button
            onClick={() => fetchNotes()}
            className="px-3 py-2 rounded-md"
            style={{ background: COLORS.slate, color: 'white' }}
            title="Refresh"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-14 rounded-md bg-[rgba(0,0,0,0.04)] animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-6 rounded-lg bg-white shadow text-center text-[rgba(0,0,0,0.6)]">
          No notifications right now.
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map(n => {
            const isUnread = !(n.read || n._read);
            return (
              <li
                key={n.id}
                className="bg-white rounded-lg p-4 shadow-sm flex items-start gap-4 transition"
                style={{ borderLeft: `4px solid ${isUnread ? COLORS.gold : 'transparent'}` }}
                role="article"
                aria-live={isUnread ? 'polite' : 'off'}
              >
                <div
                  className="flex-shrink-0 rounded-md"
                  style={{
                    width: 56,
                    height: 56,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: COLORS.subtle,
                    borderRadius: 10,
                    fontSize: 22
                  }}
                  aria-hidden
                >
                  {n.icon || (isUnread ? '🔔' : '📨')}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="font-semibold truncate">{n.title || 'Untitled'}</div>
                        {isUnread && (
                          <div style={{ background: COLORS.gold, color: '#000', padding: '2px 8px', borderRadius: 999, fontSize: 12 }}>
                            New
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-[rgba(0,0,0,0.65)] mt-1 truncate">{n.message || ''}</div>
                    </div>

                    <div className="text-right text-xs text-[rgba(0,0,0,0.5)]">
                      <div>{humanTime(n.timestamp)}</div>
                      <div className="mt-2 flex flex-col gap-2">
                        {!n.read && !n._read && (
                          <button
                            onClick={() => markRead(n.id)}
                            className="px-2 py-1 rounded-md text-xs font-medium"
                            style={{ background: COLORS.sage, color: 'white' }}
                          >
                            Mark read
                          </button>
                        )}
                        <button
                          onClick={() => dismiss(n.id)}
                          className="px-2 py-1 rounded-md text-xs"
                          style={{ background: COLORS.olive, color: 'white' }}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* subtle toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-6 bottom-6 px-4 py-2 rounded-md shadow"
          style={{ background: 'white', border: `1px solid ${COLORS.subtle}` }}
        >
          <div className="text-sm">{toast}</div>
        </div>
      )}
    </div>
  );
}

/* ---------- helpers ---------- */

function humanTime(iso) {
  if (!iso) return '—';
  try {
    const then = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now - then) / 1000);
    if (diff < 10) return 'just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 60 * 86400) return `${Math.floor(diff / 86400)}d ago`;
    return then.toLocaleDateString();
  } catch {
    return iso;
  }
}
