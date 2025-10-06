// src/PoliceStation/pages/PoliceDashboard.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supebaseClient';
import { useNavigate } from 'react-router-dom';

const THEME = {
  darkest: '#09110D',
  dark: '#0B3221',
  mid: '#135E3D',
  bright: '#1AA06D',
  textOnDark: '#E8F8F5',
  muted: '#9FBEB5'
};

export default function PoliceDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    display_name: '',
    job_description: '',
    police_station: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

        if (!currentUser) {
          setProfile(null);
          setLoading(false);
          return;
        }

        // Try to fetch profile row (if table/columns exist)
        try {
          const { data: rows, error: fetchErr } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .limit(1);

          if (fetchErr) {
            console.warn('Profile fetch error (may be missing columns):', fetchErr);
            // fallback to local
            const pendingName = safeLocal(`display_name_${currentUser.id}`) || '';
            const pendingJob = safeLocal(`job_description_${currentUser.id}`) || '';
            setProfile({
              user_id: currentUser.id,
              email: currentUser.email || '',
              requested_role: 'police',
              role: 'pending',
              display_name: pendingName || null,
              job_description: pendingJob || null,
              _is_placeholder: true
            });
            setForm({
              display_name: pendingName,
              job_description: pendingJob,
              police_station: ''
            });
          } else if (rows && rows.length > 0) {
            setProfile(rows[0]);
            setForm({
              display_name: rows[0].display_name ?? '',
              job_description: rows[0].job_description ?? '',
              police_station: rows[0].police_station ?? ''
            });
          } else {
            // no row found
            const pendingName = safeLocal(`display_name_${currentUser.id}`) || '';
            const pendingJob = safeLocal(`job_description_${currentUser.id}`) || '';
            setProfile({
              user_id: currentUser.id,
              email: currentUser.email || '',
              requested_role: 'police',
              role: 'pending',
              display_name: pendingName || null,
              job_description: pendingJob || null,
              _is_placeholder: true
            });
            setForm({
              display_name: pendingName,
              job_description: pendingJob,
              police_station: ''
            });
          }
        } catch (innerErr) {
          console.warn('Profile select failed:', innerErr);
          const pendingName = safeLocal(`display_name_${currentUser.id}`) || '';
          const pendingJob = safeLocal(`job_description_${currentUser.id}`) || '';
          setProfile({
            user_id: currentUser.id,
            email: currentUser.email || '',
            requested_role: 'police',
            role: 'pending',
            display_name: pendingName || null,
            job_description: pendingJob || null,
            _is_placeholder: true
          });
          setForm({
            display_name: pendingName,
            job_description: pendingJob,
            police_station: ''
          });
        }
      } catch (err) {
        console.error('Init police dashboard error', err);
        setError('Could not load police dashboard.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, []);

  function safeLocal(key) {
    try {
      return localStorage.getItem(key) || null;
    } catch {
      return null;
    }
  }

  function persistLocal(key, value) {
    try {
      if (value === null || value === undefined) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      // ignore localstorage errors (private mode)
    }
  }

  function slugify(name) {
    return (name || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async function generateUniqueDisplayId(base) {
    const baseSlug = slugify(base) || 'police';
    let candidate = baseSlug;
    let suffix = 1;
    // If the column display_name_id does not exist this will likely return an error; handle gracefully
    while (true) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('display_name_id', candidate)
          .limit(1);

        if (error) {
          console.warn('Error checking display id uniqueness (falling back):', error);
          return candidate; // fallback — skip uniqueness check
        }
        if (!data || data.length === 0) return candidate;
        suffix += 1;
        candidate = `${baseSlug}-${suffix}`;
      } catch (err) {
        console.warn('generateUniqueDisplayId failed, skipping uniqueness check:', err);
        return candidate;
      }
    }
  }

  async function saveProfile() {
    setError('');
    if (!user) { setError('No authenticated user'); return; }

    const toSave = {
      display_name: form.display_name?.trim() || null,
      job_description: form.job_description?.trim() || null,
      police_station: form.police_station?.trim() || null
    };

    if (!toSave.display_name) {
      setError('Please tell us your display name (the name shown to the dashboard).');
      return;
    }

    setSaving(true);
    try {
      // try to compute display_name_id if possible
      try {
        const display_name_id = await generateUniqueDisplayId(toSave.display_name);
        toSave.display_name_id = display_name_id;
      } catch  {
        // ignore, continue
      }

      // First attempt: upsert with the fields we want (if schema supports them)
      try {
        const payload = {
          user_id: user.id,
          email: user.email ?? null,
          requested_role: 'police',
          role: profile?.role ?? 'pending',
          ...toSave
        };

        // use upsert so we create or update based on user_id
        const { data: upserted, error: upsertErr } = await supabase
          .from('profiles')
          .upsert([payload], { onConflict: 'user_id' })
          .select()
          .limit(1);

        if (upsertErr) {
          // If the error looks like missing columns, handle fallback below
          console.warn('Upsert error (trying fallback):', upsertErr);
          throw upsertErr;
        }

        if (upserted && upserted.length > 0) {
          setProfile(upserted[0]);
          setEditing(false);
          persistLocal(`display_name_${user.id}`, toSave.display_name || '');
          persistLocal(`job_description_${user.id}`, toSave.job_description || '');
          setSaving(false);
          return;
        }
      } catch (upError) {
        // fallback path: try minimal upsert (avoid unknown columns) and persist name locally
        console.warn('Profile upsert failed, attempting minimal upsert and local persist:', upError);

        try {
          const minimal = {
            user_id: user.id,
            email: user.email ?? null,
            requested_role: 'police',
            role: profile?.role ?? 'pending'
          };
          const { data: _minUp, error: minErr } = await supabase
            .from('profiles')
            .upsert([minimal], { onConflict: 'user_id' })
            .select()
            .limit(1);

          if (minErr) {
            console.error('Minimal upsert also failed:', minErr);
            setError('Could not save profile to the server. Please ask your admin to add profile columns (display_name, job_description).');
            // Persist locally so user doesn't lose changes
            persistLocal(`display_name_${user.id}`, toSave.display_name || '');
            persistLocal(`job_description_${user.id}`, toSave.job_description || '');
          } else {
            // local persist + update UI state so the name appears
            persistLocal(`display_name_${user.id}`, toSave.display_name || '');
            persistLocal(`job_description_${user.id}`, toSave.job_description || '');
            setProfile(prev => ({ ...(prev || {}), display_name: toSave.display_name, job_description: toSave.job_description }));
            setEditing(false);
          }
        } catch (minUpErr) {
          console.error('Minimal upsert exception:', minUpErr);
          setError('Could not save profile. Network or permission error.');
        }
      }
    } catch (err) {
      console.error('saveProfile main error', err);
      setError('Unexpected error saving profile.');
    } finally {
      setSaving(false);
    }
  }

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
      <div style={{ padding: 24, maxWidth: 900, margin: '40px auto', fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto' }}>
        <div style={{ background: THEME.dark, color: THEME.textOnDark, padding: 20, borderRadius: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: 24, maxWidth: 900, margin: '40px auto', fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto' }}>
        <div style={{ background: THEME.dark, color: THEME.textOnDark, padding: 20, borderRadius: 12 }}>
          <p style={{ marginBottom: 12 }}>You are not signed in.</p>
          <button onClick={() => navigate('/')} style={{ padding: '8px 14px', background: THEME.bright, color: '#fff', borderRadius: 8, border: 'none' }}>Go to login</button>
        </div>
      </div>
    );
  }

  const displayName = profile?.display_name || form.display_name || '';
  const jobDesc = profile?.job_description || form.job_description || '';

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: '32px auto', fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto' }}>
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{
          flex: '1 1 360px',
          background: `linear-gradient(180deg, ${THEME.dark}, ${THEME.mid})`,
          color: THEME.textOnDark,
          padding: 20,
          borderRadius: 14,
          boxShadow: '0 8px 30px rgba(8,14,10,0.45)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <div style={{ fontSize: 14, color: THEME.muted, marginBottom: 6 }}>Welcome back</div>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.6 }}>{displayName || 'Officer'}</div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{user.email}</div>
              <button onClick={signOut} style={{
                marginTop: 8,
                padding: '6px 10px',
                borderRadius: 8,
                background: 'transparent',
                color: THEME.textOnDark,
                border: '1px solid rgba(255,255,255,0.06)',
                cursor: 'pointer'
              }}>Sign out</button>
            </div>
          </div>

          <div style={{ marginTop: 14, fontSize: 13, color: THEME.textOnDark, opacity: 0.95 }}>
            <div style={{ marginBottom: 8 }}>{jobDesc ? jobDesc : 'Tell us a bit about what you do — this will appear on your dashboard.'}</div>

            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button onClick={() => setEditing(true)} style={{
                padding: '8px 12px',
                borderRadius: 10,
                border: 'none',
                background: THEME.bright,
                color: '#042019',
                fontWeight: 700,
                cursor: 'pointer'
              }}>{displayName ? 'Edit profile' : 'Set up profile'}</button>
              <button onClick={() => window.location.reload()} style={{
                padding: '8px 12px',
                borderRadius: 10,
                background: 'transparent',
                color: THEME.textOnDark,
                border: '1px solid rgba(255,255,255,0.06)'
              }}>Refresh</button>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{
              height: 8,
              borderRadius: 999,
              background: 'rgba(255,255,255,0.04)',
              overflow: 'hidden'
            }}>
              <div style={{
                width: profile?._is_placeholder ? '40%' : '100%',
                height: '100%',
                background: `linear-gradient(90deg, ${THEME.bright}, ${THEME.mid})`
              }} />
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: THEME.muted }}>{profile?._is_placeholder ? 'Profile incomplete' : 'Profile complete'}</div>
          </div>
        </div>

        <div style={{
          width: 320,
          background: '#fff',
          borderRadius: 12,
          padding: 16,
          boxShadow: '0 6px 22px rgba(6,10,8,0.08)'
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: '#07221A' }}>Quick overview</div>

          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#334' }}>
              <div style={{ color: '#556' }}>Role</div>
              <div style={{ fontWeight: 700 }}>{profile?.role ?? 'pending'}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#334' }}>
              <div style={{ color: '#556' }}>Station</div>
              <div style={{ fontWeight: 700 }}>{profile?.police_station ?? (form.police_station || 'Not set')}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#334' }}>
              <div style={{ color: '#556' }}>Email</div>
              <div style={{ fontWeight: 700 }}>{user.email}</div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => navigate('/police/incidents')} style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: 8,
                background: THEME.mid,
                color: THEME.textOnDark,
                border: 'none',
                cursor: 'pointer'
              }}>Incidents</button>
              <button onClick={() => navigate('/police/receive')} style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: 8,
                background: '#f3f6f5',
                color: '#0b2a24',
                border: '1px solid rgba(0,0,0,0.04)'
              }}>Received</button>
            </div>
          </div>
        </div>
      </div>

      {editing && (
        <div style={{
          marginTop: 20,
          background: '#fff',
          borderRadius: 12,
          padding: 18,
          boxShadow: '0 10px 34px rgba(9,14,12,0.06)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>Welcome — set your name</div>
              <div style={{ fontSize: 13, color: '#6b7b77' }}>This name will be shown on the dashboard and saved to your account (linked to your email).</div>
            </div>
            <div style={{ fontSize: 12, color: '#6b7b77' }}>Email: <strong>{user.email}</strong></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: '#334' }}>Display name</label>
              <input
                value={form.display_name}
                onChange={(e) => setForm(f => ({ ...f, display_name: e.target.value }))}
                placeholder="e.g. Inspector John Doe"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(16,24,20,0.06)'
                }}
              />

              <label style={{ display: 'block', fontSize: 13, marginTop: 12, marginBottom: 6, color: '#334' }}>Brief job description</label>
              <textarea
                value={form.job_description}
                onChange={(e) => setForm(f => ({ ...f, job_description: e.target.value }))}
                placeholder="e.g. Patrol supervisor, evidence logging, community liaison"
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(16,24,20,0.06)',
                  resize: 'vertical'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: '#334' }}>Police station (optional)</label>
              <input
                value={form.police_station}
                onChange={(e) => setForm(f => ({ ...f, police_station: e.target.value }))}
                placeholder="Station name"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(16,24,20,0.06)'
                }}
              />

              <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                <button onClick={saveProfile} disabled={saving} style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: THEME.bright,
                  border: 'none',
                  color: '#06231a',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}>{saving ? 'Saving...' : 'Save profile'}</button>

                <button onClick={() => {
                  setForm({
                    display_name: profile?.display_name ?? '',
                    job_description: profile?.job_description ?? '',
                    police_station: profile?.police_station ?? ''
                  });
                }} style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: '#f3f6f5',
                  border: '1px solid rgba(0,0,0,0.04)',
                  cursor: 'pointer'
                }}>Reset</button>
              </div>

              <button onClick={() => setEditing(false)} style={{
                marginTop: 10,
                width: '100%',
                padding: '8px 10px',
                borderRadius: 8,
                background: 'transparent',
                color: '#6b7b77',
                border: '1px solid rgba(0,0,0,0.04)'
              }}>Close</button>

              {error && <div style={{ marginTop: 10, color: '#b34141', fontSize: 13 }}>{error}</div>}
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
        <button onClick={() => navigate('/police/incidents')} style={{
          padding: '10px 14px',
          borderRadius: 10,
          background: THEME.mid,
          color: THEME.textOnDark,
          border: 'none',
          cursor: 'pointer'
        }}>Go to incidents</button>
        <button onClick={() => navigate('/police/receive')} style={{
          padding: '10px 14px',
          borderRadius: 10,
          background: '#fff',
          color: '#07221A',
          border: '1px solid rgba(0,0,0,0.06)',
          cursor: 'pointer'
        }}>Received items</button>
      </div>
    </div>
  );
}
