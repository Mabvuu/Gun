// frontend/src/MOJ/pages/MOJDashboard.jsx
import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../../supebaseClient'; // adjust path if needed

const COLORS = {
  veryLight: '#EEF2F0',
  gray: '#858585',
  mint: '#63DBD5',
  teal: '#15696F',
  dark: '#282828',
};

export default function MOJDashboard() {
  const [ownerEmail, setOwnerEmail] = useState(null);
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();

  // determine owner email (supabase-aware fallback)
  useEffect(() => {
    let mounted = true;
    async function detect() {
      try {
        if (supabase && supabase.auth && supabase.auth.getUser) {
          const { data } = await supabase.auth.getUser();
          const email = data?.user?.email || null;
          if (mounted) setOwnerEmail(email);
          return;
        }
      } catch {
        // ignore
      }
      const saved = localStorage.getItem('email') || sessionStorage.getItem('email');
      if (mounted && saved) setOwnerEmail(saved);
    }
    detect();

    const { data: sub } = supabase?.auth?.onAuthStateChange?.((_, session) => {
      const email = session?.user?.email || null;
      setOwnerEmail(email);
    }) || {};

    return () => {
      mounted = false;
      if (sub?.subscription?.unsubscribe) sub.subscription.unsubscribe();
      if (sub?.unsubscribe) sub.unsubscribe();
    };

  }, []);

  // load profile for the ownerEmail
  useEffect(() => {
    if (!ownerEmail) {
      // check anon/local profile
      const raw = localStorage.getItem('moj_profile:anon');
      if (raw) setProfile(JSON.parse(raw));
      return;
    }
    try {
      const raw = localStorage.getItem(`moj_profile:${ownerEmail}`);
      if (raw) {
        setProfile(JSON.parse(raw));
      } else {
        // if no profile saved for this user, try minimal prefill
        const fallback = { fullName: '', avatarDataUrl: '', email: ownerEmail };
        setProfile(fallback);
      }
    } catch {
      // ignore parse errors
    }
  }, [ownerEmail]);

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background: `linear-gradient(180deg, rgba(99,219,213,0.04) 0%, rgba(21,105,111,0.03) 100%)`,
        ['--veryLight']: COLORS.veryLight,
        ['--gray']: COLORS.gray,
        ['--mint']: COLORS.mint,
        ['--teal']: COLORS.teal,
        ['--dark']: COLORS.dark,
      }}
    >
      <div className="relative z-10 max-w-6xl mx-auto p-6" style={{ boxSizing: 'border-box' }}>
        <header className="mb-6">
          <div
            className="rounded-xl p-6"
            style={{
              background:
                'linear-gradient(90deg, rgba(255,255,255,0.6), rgba(99,219,213,0.06))',
              border: `1px solid rgba(14,30,31,0.04)`,
              backdropFilter: 'blur(6px)',
              boxShadow: '0 6px 22px rgba(10,20,20,0.06)',
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold" style={{ color: COLORS.dark }}>
                  Hello friend — you are the Ministry of Justice (MOJ)
                </h1>
                <p className="mt-2 text-sm max-w-3xl" style={{ color: COLORS.dark, opacity: 0.9 }}>
                  Your job is to protect the public and uphold the rule of law. That means reviewing incoming applications, prioritising urgent matters, coordinating with enforcement partners, auditing records for accuracy and compliance, and ensuring justice is administered fairly and quickly.
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    className="px-4 py-2 rounded-md font-medium"
                    style={{
                      background: COLORS.mint,
                      color: COLORS.dark,
                      border: `1px solid rgba(0,0,0,0.04)`,
                    }}
                    onClick={() => navigate('/moj/receive')}
                  >
                    Go to Receive
                  </button>

                  <button
                    className="px-4 py-2 rounded-md font-medium"
                    style={{
                      background: 'transparent',
                      color: COLORS.dark,
                      border: `1px solid ${COLORS.veryLight}`,
                    }}
                    onClick={() => navigate('/moj/profile')}
                  >
                    View Profile
                  </button>
                </div>
              </div>

              {/* Profile preview */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 9999, overflow: 'hidden', background: 'rgba(0,0,0,0.04)' }}>
                    {profile?.avatarDataUrl ? (
                    
                      <img src={profile.avatarDataUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.gray }}>👤</div>
                    )}
                  </div>

                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, color: COLORS.dark }}>
                      {profile?.fullName || profile?.email || 'MOJ user'}
                    </div>
                    <div style={{ fontSize: 12, color: COLORS.gray }}>
                      {profile?.email || ownerEmail || 'not signed in'}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 8, color: COLORS.gray, fontSize: 12 }}>
                  Last sync: a few moments ago
                </div>
              </div>
            </div>
          </div>
        </header>

        <main>
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6" aria-label="MOJ dashboard panels">
            <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.86)', border: `1px solid ${COLORS.veryLight}`, boxShadow: '0 4px 18px rgba(10,20,20,0.04)', color: COLORS.dark }}>
              <h2 className="font-semibold">Pending Receive</h2>
              <p className="text-sm mt-2" style={{ color: COLORS.gray }}>
                Items waiting in the receive queue — prioritise urgent requests and check required documents.
              </p>
            </div>

            <div className="rounded-lg p-4" style={{ background: COLORS.mint, color: COLORS.dark, boxShadow: '0 4px 18px rgba(10,20,20,0.04)' }}>
              <h2 className="font-semibold">Records & Audits</h2>
              <p className="text-sm mt-2" style={{ color: COLORS.dark }}>
                Inspect recent audits, flag inconsistencies, and ensure records match submitted evidence.
              </p>
            </div>

            <div className="rounded-lg p-4" style={{ background: COLORS.teal, color: COLORS.veryLight, boxShadow: '0 4px 18px rgba(10,20,20,0.06)' }}>
              <h2 className="font-semibold">Coordination</h2>
              <p className="text-sm mt-2" style={{ color: COLORS.veryLight }}>
                Messages and coordination tasks with enforcement and judicial partners appear here.
              </p>
            </div>
          </section>

          <div className="mt-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
