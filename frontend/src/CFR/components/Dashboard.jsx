// src/pages/CFRDashboard.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../supebaseClient';
import { useNavigate } from 'react-router-dom';

export default function CFRDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    display_name: '',
    cfr_station: '',
    province: '',
    town: '',
    area: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function init() {
      setLoading(true);
      setError('');
      try {
        // get current user (works with supabase-js v2)
        let currentUser = null;
        try {
          const res = await supabase.auth.getUser();
          currentUser = res?.data?.user ?? null;
        } catch {
          // fallback older SDK
          currentUser = supabase.auth.user ? supabase.auth.user() : null;
        }

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

        if (fetchErr) console.error('Profile fetch error:', fetchErr);

        if (rows && rows.length > 0) {
          setProfile(rows[0]);
          setForm({
            display_name: rows[0].display_name ?? '',
            cfr_station: rows[0].cfr_station ?? '',
            province: rows[0].province ?? '',
            town: rows[0].town ?? '',
            area: rows[0].area ?? ''
          });
        } else {
          // fallback to pending signup values in localStorage
          const pending = {
            email: safeLocal('pending_request_email'),
            requested_role: safeLocal('pending_request_role'),
            province: safeLocal('pending_request_province'),
            town: safeLocal('pending_request_town'),
            club: safeLocal('pending_request_club'),
            police_station: safeLocal('pending_request_police_station'),
            area: safeLocal('pending_request_area')
          };

          setProfile({
            user_id: currentUser.id,
            email: currentUser.email ?? pending.email ?? '',
            requested_role: pending.requested_role ?? 'cfr',
            role: 'pending',
            province: pending.province ?? null,
            town: pending.town ?? null,
            club: pending.club ?? null,
            police_station: pending.police_station ?? null,
            area: pending.area ?? null,
            display_name: null,
            display_name_id: null,
            created_at: null,
            _is_placeholder: true
          });

          setForm({
            display_name: '',
            cfr_station: pending.police_station ?? '', // reuse if user saved station at signup
            province: pending.province ?? '',
            town: pending.town ?? '',
            area: pending.area ?? ''
          });
        }
      } catch (err) {
        console.error('Init CFR dashboard error', err);
        setError('Could not load CFR dashboard.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();
    return () => { mounted = false; };
  }, []);

  function safeLocal(key) {
    try {
      return localStorage.getItem(key) || null;
    } catch {
      return null;
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
    const baseSlug = slugify(base) || 'cfr';
    let candidate = baseSlug;
    let suffix = 1;
    while (true) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('display_name_id', candidate)
        .limit(1);

      if (error) {
        console.warn('Error checking display id uniqueness', error);
        return candidate;
      }
      if (!data || data.length === 0) return candidate;
      suffix += 1;
      candidate = `${baseSlug}-${suffix}`;
    }
  }

  async function saveProfile() {
    setError('');
    if (!user) { setError('No authenticated user'); return; }

    const toSave = {
      display_name: form.display_name?.trim() || null,
      cfr_station: form.cfr_station?.trim() || null,
      province: form.province?.trim() || null,
      town: form.town?.trim() || null,
      area: form.area?.trim() || null
    };

    // Require at least a station name or display name
    if (!toSave.cfr_station && !toSave.display_name) {
      setError('Please provide your CFR station or a display name.');
      return;
    }

    setSaving(true);
    try {
      if (toSave.display_name) {
        const display_name_id = await generateUniqueDisplayId(toSave.display_name);
        toSave.display_name_id = display_name_id;
      }

      // try update
      const { data: updated, error: updErr } = await supabase
        .from('profiles')
        .update(toSave)
        .eq('user_id', user.id)
        .select()
        .limit(1);

      if (updErr) {
        console.warn('Update failed (will try insert):', updErr);
      }

      if (updated && updated.length > 0) {
        setProfile(prev => ({ ...(prev || {}), ...updated[0] }));
        setEditing(false);
        setSaving(false);
        return;
      }

      // insert fallback
      const payload = {
        user_id: user.id,
        email: user.email ?? null,
        requested_role: 'cfr',
        role: profile?.role ?? 'pending',
        ...toSave
      };

      const { data: inserted, error: insErr } = await supabase
        .from('profiles')
        .insert([payload])
        .select()
        .limit(1);

      if (insErr) {
        console.error('Insert profile failed:', insErr);
        setError('Could not save profile.');
      } else if (inserted && inserted.length > 0) {
        setProfile(inserted[0]);
        setEditing(false);
      }
    } catch (err) {
      console.error('saveProfile error', err);
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

  if (loading) return <div className="p-6 max-w-2xl mx-auto">Loading CFR dashboard...</div>;

  if (!user) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <p className="mb-4">You are not signed in.</p>
        <button onClick={() => navigate('/')} className="px-4 py-2 bg-indigo-600 text-white rounded">Go to login</button>
      </div>
    );
  }

  const isCFRUser = (profile?.requested_role === 'cfr' || profile?.role === 'cfr');

  return (
    <div className="max-w-3xl mx-auto mt-8 bg-white p-6 rounded shadow">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-semibold">CFR dashboard</h2>
          <div className="text-sm text-gray-600">Signed in as {user.email}</div>
        </div>
        <div className="text-right">
          <button onClick={signOut} className="text-sm underline text-indigo-600">Sign out</button>
        </div>
      </div>

      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

      {!isCFRUser && (
        <div className="mb-4 p-3 rounded bg-yellow-50 text-sm text-yellow-800 border">
          Your account is not currently marked as CFR. Fields will still save but an admin must approve your CFR role.
        </div>
      )}

      <div className="mb-6 border rounded overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 text-sm font-medium">Profile</div>
        <div className="px-4 py-4">
          <div className="mb-3">
            <div className="text-sm text-gray-600">Display name</div>
            <div className="text-lg font-semibold">{profile?.display_name ?? <span className="text-gray-400">Not set</span>}</div>
            {profile?.display_name_id && <div className="text-xs text-gray-500">id: {profile.display_name_id}</div>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">CFR station</div>
              <div className="font-medium">{profile?.cfr_station ?? <span className="text-gray-400">Not set</span>}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Role</div>
              <div className="font-medium">{profile?.role ?? 'pending'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Province</div>
              <div className="font-medium">{profile?.province ?? <span className="text-gray-400">Not set</span>}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Town</div>
              <div className="font-medium">{profile?.town ?? <span className="text-gray-400">Not set</span>}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-sm text-gray-600">Area</div>
              <div className="font-medium">{profile?.area ?? <span className="text-gray-400">Not set</span>}</div>
            </div>
          </div>

          {profile?._is_placeholder && (
            <div className="mt-3 text-xs text-yellow-800 bg-yellow-50 p-2 rounded">
              No profile row found in the database. The values above come from pending signup data or auth. Saving the profile will create the DB record.
            </div>
          )}
        </div>
      </div>

      {editing ? (
        <div className="mb-6 p-4 border rounded bg-gray-50">
          <h3 className="text-lg font-medium mb-3">Edit profile</h3>

          <label className="block text-sm mb-1">Display name</label>
          <input value={form.display_name} onChange={(e)=>setForm(f=>({...f, display_name: e.target.value}))} className="w-full px-3 py-2 border rounded mb-3" placeholder="e.g. CFR - Harare Central" />

          <label className="block text-sm mb-1">CFR station</label>
          <input value={form.cfr_station} onChange={(e)=>setForm(f=>({...f, cfr_station: e.target.value}))} className="w-full px-3 py-2 border rounded mb-3" placeholder="Station name" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Province</label>
              <input value={form.province} onChange={(e)=>setForm(f=>({...f, province: e.target.value}))} className="w-full px-3 py-2 border rounded" placeholder="Province" />
            </div>
            <div>
              <label className="block text-sm mb-1">Town</label>
              <input value={form.town} onChange={(e)=>setForm(f=>({...f, town: e.target.value}))} className="w-full px-3 py-2 border rounded" placeholder="Town" />
            </div>
          </div>

          <label className="block text-sm mb-1 mt-3">Area</label>
          <input value={form.area} onChange={(e)=>setForm(f=>({...f, area: e.target.value}))} className="w-full px-3 py-2 border rounded mb-3" placeholder="Area" />

          <div className="flex items-center space-x-3">
            <button onClick={saveProfile} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded">{saving ? 'Saving...' : 'Save'}</button>
            <button onClick={()=>setEditing(false)} className="px-4 py-2 border rounded">Cancel</button>
            <button onClick={()=>setForm({
              display_name: profile?.display_name ?? '',
              cfr_station: profile?.cfr_station ?? '',
              province: profile?.province ?? '',
              town: profile?.town ?? '',
              area: profile?.area ?? ''
            })} className="px-3 py-2 text-sm">Reset</button>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <button onClick={()=>setEditing(true)} className="px-4 py-2 bg-green-600 text-white rounded">Edit profile</button>
        </div>
      )}

      <div className="mt-6 flex space-x-3">
        <button onClick={()=>navigate('/cfr/incidents')} className="px-4 py-2 border rounded">Incidents</button>
        <button onClick={()=>navigate('/cfr/alerts')} className="px-4 py-2 border rounded">Alerts</button>
        <button onClick={()=>window.location.reload()} className="px-4 py-2 border rounded">Refresh</button>
      </div>
    </div>
  );
}

