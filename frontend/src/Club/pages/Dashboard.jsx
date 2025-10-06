// src/Club/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supebaseClient';
import { useNavigate } from 'react-router-dom';

const COLORS = {
  gold: '#DAA112',
  sage: '#809276',
  olive: '#666E51',
  deepTeal: '#10383A',
  slate: '#768886'
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); // now used in UI
  const [counts, setCounts] = useState({
    members: '—',
    applicants: '—',
    pendingApprovals: '—'
  });

  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);
      setError('');
      try {
        const { data } = await supabase.auth.getUser();
        const currentUser = data?.user ?? null;
        if (!mounted) return;
        setUser(currentUser);

        // fetch simple counts (safe: wrapped in try/catch)
        await fetchCounts();
      } catch (err) {
        console.error('Init dashboard error', err);
        if (mounted) setError('Could not load dashboard.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    async function fetchCounts() {
      try {
        // these queries use supabase count mode; if tables don't exist we'll catch and leave placeholders
        const membersRes = await supabase.from('members').select('id', { count: 'exact', head: false });
        const applicantsRes = await supabase.from('applications').select('id', { count: 'exact', head: false });
        // pending approvals: try to count profiles with role = 'pending' OR requested_role = 'club'
        const pendingRes = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: false })
          .or('role.eq.pending,requested_role.eq.club');

        setCounts({
          members: membersRes?.count ?? '—',
          applicants: applicantsRes?.count ?? '—',
          pendingApprovals: pendingRes?.count ?? '—'
        });
      } catch (e) {
        // if any of these tables/columns don't exist, we won't crash — show a small error but keep UI usable
        console.warn('Count fetch warning (table may not exist):', e);
        setError(prev => prev || 'Some stats could not be loaded.');
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, []);

  async function signOut() {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (err) {
      console.error('Sign out error', err);
      setError('Sign out failed — try again.');
    }
  }

  if (loading) {
    return <div className="p-6 max-w-4xl mx-auto">Loading club dashboard...</div>;
  }

  if (!user) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <p className="mb-4">You are not signed in.</p>
        <button onClick={() => navigate('/')} className="px-4 py-2 rounded" style={{ background: COLORS.gold, color: '#fff' }}>
          Go to login
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto mt-8 p-6">
      {/* Error banner (uses `error`) */}
      {error && (
        <div className="mb-4 p-3 rounded" style={{ background: 'rgba(255,80,80,0.08)', color: '#9b1c1c' }}>
          {error}
        </div>
      )}

      {/* Hero */}
      <div
        className="rounded-lg p-6 mb-6"
        style={{
          background: `linear-gradient(135deg, ${COLORS.deepTeal} 0%, ${COLORS.sage} 100%)`,
          color: 'white',
          boxShadow: '0 8px 24px rgba(16,56,58,0.14)'
        }}
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold mb-1">Club control center</h1>
            <div className="text-sm opacity-90">Signed in as <span className="font-medium">{user.email}</span></div>
            <p className="mt-3 text-sm opacity-95">
              Clean overview and quick actions for your club.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/club/members')}
                className="px-4 py-2 rounded text-sm font-medium"
                style={{ background: COLORS.gold, color: '#fff', border: 'none' }}
              >
                View members
              </button>

              <button
                onClick={() => navigate('/club/applicants')}
                className="px-4 py-2 rounded text-sm font-medium"
                style={{ background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Review applications
              </button>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <div className="text-sm mb-2">Account</div>
            <button onClick={signOut} className="px-3 py-2 rounded text-sm font-medium" style={{ background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.12)' }}>
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Members" value={counts.members} accent={COLORS.gold} />
        <StatCard title="Applicants" value={counts.applicants} accent={COLORS.sage} />
        <StatCard title="Pending approvals" value={counts.pendingApprovals} accent={COLORS.olive} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="p-4 rounded-lg shadow-sm bg-white">
            <h3 className="text-lg font-semibold mb-3">Quick actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ActionBtn label="Add member" onClick={() => navigate('/club/members/add')} color={COLORS.sage} />
              <ActionBtn label="Upload membership" onClick={() => navigate('/club/upload-membership')} color={COLORS.gold} />
              <ActionBtn label="Mark attendance" onClick={() => navigate('/club/attendance')} color={COLORS.olive} />
            </div>
          </div>

          <div className="p-4 mt-4 rounded-lg shadow-sm bg-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Recent activity</h3>
              <button className="text-sm text-[rgba(0,0,0,0.6)]" onClick={() => window.location.reload()}>Refresh</button>
            </div>
            <div className="text-sm text-[rgba(0,0,0,0.7)]">
              <ul className="space-y-3">
                <li className="py-2 border-b last:border-b-0">No recent activity to show.</li>
              </ul>
            </div>
          </div>
        </div>

        <div>
          <div className="p-4 rounded-lg shadow-sm bg-white">
            <h4 className="text-md font-semibold mb-2">Club status</h4>
            <div className="text-sm text-[rgba(0,0,0,0.7)]">Manage applicants, members and attendance from here.</div>
            <div className="mt-3">
              <button onClick={() => navigate('/club/applicants')} className="px-3 py-2 rounded text-sm" style={{ background: COLORS.sage, color: '#fff' }}>
                Manage applicants
              </button>
            </div>
          </div>

          <div className="p-4 mt-4 rounded-lg shadow-sm bg-white">
            <h4 className="text-md font-semibold mb-2">Support</h4>
            <div className="text-sm text-[rgba(0,0,0,0.7)]">Need help? Contact your admin.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Small helpers ---------- */

function StatCard({ title, value, accent }) {
  return (
    <div className="p-4 rounded-lg shadow-sm bg-white flex items-center justify-between">
      <div>
        <div className="text-sm text-[rgba(0,0,0,0.6)]">{title}</div>
        <div className="text-2xl font-bold">{value}</div>
      </div>
      <div style={{ width: 52, height: 52, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: accent }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 2v20" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M5 12h14" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}

function ActionBtn({ label, onClick, color }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2 rounded text-sm w-full text-left"
      style={{
        background: color,
        color: '#fff',
        boxShadow: '0 6px 16px rgba(16,56,58,0.06)'
      }}
    >
      {label}
    </button>
  );
}
