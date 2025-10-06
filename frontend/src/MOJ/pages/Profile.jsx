// frontend/src/MOJ/pages/Profile.jsx
import React, { useEffect, useState, useRef } from 'react';

const COLORS = {
  veryLight: '#EEF2F0',
  gray: '#858585',
  mint: '#63DBD5',
  teal: '#15696F',
  dark: '#282828',
};

const PROVINCES = [
  'Harare',
  'Bulawayo',
  'Manicaland',
  'Mashonaland Central',
  'Mashonaland East',
  'Mashonaland West',
  'Masvingo',
  'Matabeleland North',
  'Matabeleland South',
  'Midlands',
];

const TOWNS = {
  Harare: ['Harare', 'Chitungwiza'],
  Bulawayo: ['Bulawayo'],
  Manicaland: ['Mutare', 'Buhera', 'Rusape'],
  'Mashonaland Central': ['Bindura', 'Mazowe'],
  'Mashonaland East': ['Marondera', 'Chivhu'],
  'Mashonaland West': ['Chegutu', 'Kadoma'],
  Masvingo: ['Masvingo', 'Chiredzi'],
  'Matabeleland North': ['Hwange', 'Lupane'],
  'Matabeleland South': ['Gwanda', 'Beitbridge'],
  Midlands: ['Gweru', 'Kwekwe'],
};

const SAMPLE_PROFILE = {
  fullName: 'Patty',
  email: 'patty.dev@local',
  phone: '+263 77 000 0000',
  office: 'Developer / MOJ (sim)',
  province: 'Manicaland',
  town: 'Rusape',
  bio: 'Simulated MOJ profile — use for UI previews.',
  avatarDataUrl:
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect fill="#63DBD5" width="100%" height="100%"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="48" fill="#082a2b">P</text></svg>`
    ),
};

export default function Profile() {
  const [profile, setProfile] = useState({ ...SAMPLE_PROFILE });
  const [townsForProvince, setTownsForProvince] = useState(TOWNS[SAMPLE_PROFILE.province] || []);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(Date.now());
  const topRef = useRef(null);

  const storageKey = `moj_profile:simulated:patty`;
  const savedAtKey = `${storageKey}:savedAt`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        setProfile((p) => ({ ...p, ...parsed }));
        if (parsed.province) setTownsForProvince(TOWNS[parsed.province] || []);
      } else {
        localStorage.setItem(storageKey, JSON.stringify(SAMPLE_PROFILE));
        localStorage.setItem(savedAtKey, String(Date.now()));
      }
      const savedAt = localStorage.getItem(savedAtKey);
      if (savedAt) setLastSavedAt(Number(savedAt));
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const towns = TOWNS[profile.province] || [];
    setTownsForProvince(towns);
    if (profile.province && profile.town && !towns.includes(profile.town)) {
      setProfile((p) => ({ ...p, town: '' }));
    }
  }, [profile.province, profile.town]);

  function updateField(field, value) {
    setProfile((p) => ({ ...p, [field]: value }));
  }

  function handleAvatarFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setStatus({ type: 'error', msg: 'Please upload an image file for avatar.' });
      setTimeout(() => setStatus(null), 1600);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateField('avatarDataUrl', String(reader.result));
    reader.readAsDataURL(file);
  }

  async function handleSave(e) {
    e?.preventDefault?.();
    setSaving(true);
    setStatus(null);

    if (!profile.fullName?.trim()) {
      setStatus({ type: 'error', msg: 'Full name required.' });
      setSaving(false);
      setTimeout(() => setStatus(null), 1600);
      return;
    }
    if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      setStatus({ type: 'error', msg: 'Invalid email.' });
      setSaving(false);
      setTimeout(() => setStatus(null), 1600);
      return;
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(profile));
      const now = Date.now();
      localStorage.setItem(savedAtKey, String(now));
      setLastSavedAt(now);
      setStatus({ type: 'success', msg: 'Saved (local).' });
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', msg: 'Save failed.' });
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(null), 1600);
    }
  }

  function handleClear() {
    setProfile({
      fullName: '',
      email: '',
      phone: '',
      office: '',
      province: '',
      town: '',
      bio: '',
      avatarDataUrl: '',
    });
    setTownsForProvince([]);
    localStorage.removeItem(storageKey);
    localStorage.removeItem(savedAtKey);
    setLastSavedAt(null);
    setStatus({ type: 'success', msg: 'Cleared.' });
    setTimeout(() => setStatus(null), 1200);
  }

  function handleCopyEmail() {
    if (!profile.email) return;
    navigator.clipboard?.writeText(profile.email).then(() => {
      setStatus({ type: 'success', msg: 'Email copied.' });
      setTimeout(() => setStatus(null), 1200);
    }).catch(() => {
      setStatus({ type: 'error', msg: 'Copy failed.' });
      setTimeout(() => setStatus(null), 1200);
    });
  }

  function handleEditClick() {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      const first = document.querySelector('input, textarea, select');
      if (first) first.focus();
    }, 180);
  }

  const formatSavedAt = (ts) => (ts ? new Date(Number(ts)).toLocaleString() : 'Never');

  return (
    <div className="p-4">
      {/* VIEW-ONLY PROFILE CARD (TOP) */}
      <section
        ref={topRef}
        className="max-w-3xl mx-auto rounded-lg p-6 mb-6"
        style={{ background: `linear-gradient(90deg, rgba(99,219,213,0.06), rgba(21,105,111,0.03))`, border: `1px solid ${COLORS.veryLight}` }}
      >
        <div className="flex items-center gap-5">
          <div className="w-24 h-24 rounded-xl overflow-hidden bg-white flex items-center justify-center">
            {profile.avatarDataUrl ? (
              <img src={profile.avatarDataUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="text-3xl text-gray-400">👤</div>
            )}
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-semibold" style={{ color: COLORS.dark }}>{profile.fullName || 'MOJ user'}</h3>
            <div className="text-sm text-gray-500 mt-1">{profile.office || 'Ministry of Justice'}</div>

            <div className="flex items-center gap-3 mt-4">
              <div className="bg-white border rounded-md px-3 py-2">
                <div className="text-xs text-gray-500">Email</div>
                <div className="text-sm" style={{ color: COLORS.dark }}>{profile.email || '—'}</div>
              </div>

              <div className="bg-white border rounded-md px-3 py-2">
                <div className="text-xs text-gray-500">Phone</div>
                <div className="text-sm" style={{ color: COLORS.dark }}>{profile.phone || '—'}</div>
              </div>

              <div className="ml-auto text-right">
                <div className="text-xs text-gray-500">Last saved</div>
                <div className="font-medium" style={{ color: COLORS.dark }}>{formatSavedAt(lastSavedAt)}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={handleEditClick}
              className="px-3 py-2 rounded-md text-sm font-medium"
              style={{ background: COLORS.mint, color: COLORS.dark }}
            >
              Edit
            </button>
            <button
              onClick={handleCopyEmail}
              className="px-3 py-2 rounded-md text-sm border"
              style={{ borderColor: COLORS.veryLight, color: COLORS.dark, background: 'transparent' }}
            >
              Copy Email
            </button>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t" style={{ borderColor: COLORS.veryLight }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500">Province</div>
              <div className="text-sm" style={{ color: COLORS.dark }}>{profile.province || '—'}</div>
            </div>

            <div>
              <div className="text-xs text-gray-500">Town</div>
              <div className="text-sm" style={{ color: COLORS.dark }}>{profile.town || '—'}</div>
            </div>

            <div className="md:col-span-2">
              <div className="text-xs text-gray-500">Bio</div>
              <div className="text-sm mt-1" style={{ color: COLORS.dark }}>{profile.bio || '—'}</div>
            </div>
          </div>
        </div>
      </section>

      {/* EDITABLE FORM (BOTTOM) */}
      <section className="max-w-3xl mx-auto bg-white border rounded-lg p-6" style={{ borderColor: COLORS.veryLight }}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500">Full name</label>
              <input
                className="mt-2 w-full rounded-md px-3 py-2 border"
                style={{ borderColor: COLORS.veryLight }}
                value={profile.fullName}
                onChange={(e) => updateField('fullName', e.target.value)}
                placeholder="Full name"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500">Email</label>
              <input
                className="mt-2 w-full rounded-md px-3 py-2 border"
                style={{ borderColor: COLORS.veryLight }}
                value={profile.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="you@agency.tld"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500">Phone</label>
              <input
                className="mt-2 w-full rounded-md px-3 py-2 border"
                style={{ borderColor: COLORS.veryLight }}
                value={profile.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="+263 ..."
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500">Office / Role</label>
              <input
                className="mt-2 w-full rounded-md px-3 py-2 border"
                style={{ borderColor: COLORS.veryLight }}
                value={profile.office}
                onChange={(e) => updateField('office', e.target.value)}
                placeholder="Office / Role"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500">Province</label>
              <select
                className="mt-2 w-full rounded-md px-3 py-2 border"
                style={{ borderColor: COLORS.veryLight }}
                value={profile.province}
                onChange={(e) => updateField('province', e.target.value)}
              >
                <option value="">— Select province —</option>
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500">Town</label>
              <select
                className="mt-2 w-full rounded-md px-3 py-2 border"
                style={{ borderColor: COLORS.veryLight }}
                value={profile.town}
                onChange={(e) => updateField('town', e.target.value)}
              >
                <option value="">— Select town —</option>
                {(townsForProvince || []).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500">Short bio / notes</label>
            <textarea
              rows={4}
              className="mt-2 w-full rounded-md px-3 py-2 border"
              style={{ borderColor: COLORS.veryLight }}
              value={profile.bio}
              onChange={(e) => updateField('bio', e.target.value)}
              placeholder="Anything else to show on your profile"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500">Avatar (image)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarFile}
              className="mt-2"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-md font-medium"
              style={{ background: COLORS.teal, color: 'white' }}
            >
              {saving ? 'Saving…' : 'Save profile'}
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 rounded-md border"
              style={{ borderColor: COLORS.veryLight, color: COLORS.dark }}
            >
              Clear
            </button>

            {status && (
              <div
                className="text-sm px-3 py-1 rounded-md"
                style={{
                  background: status.type === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(255,99,99,0.08)',
                  color: status.type === 'success' ? '#165a19' : '#7f1d1d',
                  border: `1px solid ${COLORS.veryLight}`,
                }}
              >
                {status.msg}
              </div>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
