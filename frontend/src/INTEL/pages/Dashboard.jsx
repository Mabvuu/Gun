// src/pages/IntelDashboard.jsx
import React, { useEffect, useState } from 'react';
import { supabase, getCurrentUser } from '../../supebaseClient';
import { useNavigate } from 'react-router-dom';

export default function IntelDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function init() {
      setLoading(true);
      setError('');
      try {
        const currentUser = await getCurrentUser();
        if (!mounted) return;
        setUser(currentUser);

        if (!currentUser) {
          setProfile(null);
          setLoading(false);
          return;
        }

        const { data: rows, error: fetchErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', currentUser.id)
          .limit(1);

        if (fetchErr) console.warn('Profile fetch error:', fetchErr);

        if (rows && rows.length > 0) {
          setProfile(rows[0]);
        } else {
          setProfile({
            user_id: currentUser.id,
            email: currentUser.email ?? '',
            requested_role: 'intel',
            role: 'pending',
            _is_placeholder: true
          });
        }
      } catch (err) {
        console.error('Init intel dashboard error', err);
        setError('Could not load intel dashboard.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    init();
    return () => { mounted = false; };
  }, []);

  async function signOut() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error', err);
    } finally {
      navigate('/');
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-sm">Loading intel dashboard...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <p className="mb-4">You are not signed in.</p>
        <button onClick={() => navigate('/')} className="px-4 py-2 bg-[#135E3D] text-white rounded">Go to login</button>
      </div>
    );
  }

  const role = profile?.role ?? profile?.requested_role ?? 'pending';
  const isIntel = role === 'intel' || profile?.requested_role === 'intel';

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 rounded-lg" style={{ backgroundColor: '#07120F' }}>
      <div className="flex justify-between items-start gap-6">
        <div className="flex items-center gap-4">
          <div
            className="w-20 h-20 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(180deg,#0B3221,#135E3D)' }}
          >
            <div className="text-white font-bold text-xl">INT</div>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: '#E6F7EE' }}>Intel Dashboard</h1>
            <div className="text-sm mt-1" style={{ color: '#CFEFE0' }}>{user.email}</div>
          </div>
        </div>

        <div className="flex flex-col items-end space-y-2">
        
          <button
            onClick={signOut}
            className="px-3 py-2 rounded-md font-medium"
            style={{ backgroundColor: '#135E3D', color: '#fff' }}
          >
            Sign out
          </button>
        </div>
      </div>

      {error && <div className="mt-6 text-sm text-red-400">{error}</div>}

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 rounded-lg p-6" style={{ background: 'linear-gradient(180deg,#09110D,#0D3A27)' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm uppercase text-[#CDEDD7]">Role</div>
              <div className="mt-2 flex items-center gap-3">
                <div className="px-3 py-1 rounded-full font-semibold" style={{
                  background: role === 'intel' ? '#1AA06D' : '#2A5B46',
                  color: '#04210D'
                }}>
                  {role}
                </div>
                {profile?._is_placeholder && (
                  <div className="text-xs px-2 py-1 rounded-md bg-yellow-50 text-yellow-800">placeholder</div>
                )}
              </div>
              <div className="mt-3 text-sm" style={{ color: '#BFDFCB' }}>
                {isIntel
                  ? 'Your account has intel privileges. Use the panels to the right to access reports and alerts.'
                  : 'Your account is not currently approved as intel. An admin must approve your role to unlock all features.'}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-[#9FBFAD]">Unit</div>
              <div className="mt-1 font-medium" style={{ color: '#E6F7EE' }}>
                {profile?.intel_unit ?? <span className="text-[#9FBFAD]">Not set</span>}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 rounded-md" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="text-xs text-[#CDEDD7]">Province</div>
              <div className="mt-1 font-medium" style={{ color: '#E6F7EE' }}>{profile?.province ?? '—'}</div>
            </div>
            <div className="p-3 rounded-md" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="text-xs text-[#CDEDD7]">Town</div>
              <div className="mt-1 font-medium" style={{ color: '#E6F7EE' }}>{profile?.town ?? '—'}</div>
            </div>
            <div className="p-3 rounded-md" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="text-xs text-[#CDEDD7]">Area</div>
              <div className="mt-1 font-medium" style={{ color: '#E6F7EE' }}>{profile?.area ?? '—'}</div>
            </div>
          </div>

          {/* Summarised role instructions */}
          <div className="mt-6 p-4 rounded-md" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.015), rgba(255,255,255,0.01))', border: '1px solid rgba(255,255,255,0.03)' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase text-[#CDEDD7]">Quick role summary</div>
                <div className="mt-2 text-sm font-semibold" style={{ color: '#E6F7EE' }}>What Intel should do</div>
              </div>
              <div className="text-xs text-[#9FBFAD]">Read this before reporting</div>
            </div>

            <ul className="mt-3 space-y-2 text-sm" style={{ color: '#BFDFCB' }}>
              <li>• Monitor dashboards, reports, and feeds for suspicious activity.</li>
              <li>• If you observe something concerning, leave a concise factual note (what, where, when, evidence).</li>
              <li>• Post an urgent warning for immediate risks and tag severity (Info / Warning / Critical).</li>
              <li>• Do not take enforcement actions — flag items for analysts or supervisors to follow up.</li>
            </ul>

            <div className="mt-3 text-xs text-[#CDEDD7]">Note: Keep notes brief (2–5 sentences), timestamped, and evidence-focused.</div>
          </div>
        </div>

        <aside className="rounded-lg p-4" style={{ background: 'linear-gradient(180deg,#081A12,#0B3221)' }}>
          <div className="text-sm text-[#CDEDD7] mb-3">Quick Actions</div>
          <button
            onClick={() => navigate('/intel/reports')}
            className="w-full mb-2 px-3 py-2 rounded-md font-semibold"
            style={{ backgroundColor: '#135E3D', color: '#fff' }}
          >
            Reports
          </button>
          <button
            onClick={() => navigate('/intel/alerts')}
            className="w-full mb-2 px-3 py-2 rounded-md font-semibold"
            style={{ background: 'transparent', color: '#CFEFE0', border: '1px solid rgba(255,255,255,0.04)' }}
          >
            Alerts
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full mt-4 px-3 py-2 rounded-md text-sm"
            style={{ background: 'transparent', color: '#9FBFAD', border: '1px dashed rgba(255,255,255,0.03)' }}
          >
            Refresh
          </button>

          {!isIntel && (
            <div className="mt-4 text-xs p-3 rounded-md bg-yellow-50 text-yellow-800">
              Pending intel approval — some features are restricted until an admin approves your role.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
