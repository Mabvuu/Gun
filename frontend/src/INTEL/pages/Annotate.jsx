// src/pages/Annotate.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Annotate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    axios
      .get(`/api/intel/records/${id}/private-notes`)
      .then(res => mounted && setNotes(res.data || []))
      .catch(err => {
        console.error('Load notes', err);
        if (mounted) setNotes([]);
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [id]);

  const saveNote = async () => {
    if (!text.trim()) return alert('Note required');
    setSaving(true);
    try {
      const payload = { text: text.trim() };
      const res = await axios.post(`/api/intel/records/${id}/private-notes`, payload);
      // prepend server-returned note (optimistic UI would also work)
      setNotes(prev => [res.data, ...prev]);
      setText('');
    } catch (err) {
      console.error('Save note', err);
      alert('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const charLimit = 1000;
  const charsLeft = Math.max(0, charLimit - text.length);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6" style={{ backgroundColor: '#07120F', minHeight: '70vh' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(180deg,#0B3221,#135E3D)' }}>
            <div className="text-white font-bold">P</div>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: '#E6F7EE' }}>Private Notes</h1>
            <div className="text-sm" style={{ color: '#CFEFE0' }}>Record #{id} — notes only visible to you</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-2 rounded-md font-medium"
            style={{ background: 'transparent', color: '#CFEFE0', border: '1px solid rgba(255,255,255,0.04)' }}
          >
            Back
          </button>
        </div>
      </div>

      <div className="rounded-lg p-4" style={{ background: 'linear-gradient(180deg,#09110D,#0D3A27)' }}>
        <label className="block text-sm font-semibold text-[#CDEDD7]">Add private note</label>
        <textarea
          rows={5}
          value={text}
          onChange={e => setText(e.target.value)}
          className="w-full mt-2 px-3 py-2 rounded-md resize-none focus:outline-none"
          style={{ background: 'rgba(255,255,255,0.02)', color: '#BFDFCB', border: '1px solid rgba(255,255,255,0.03)' }}
          placeholder="Write a concise, factual private note (not stored on-chain). Include time, location, and brief context."
          maxLength={charLimit}
        />

        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-[#9FBFAD]">{charsLeft} characters left</div>
          <div className="flex gap-2">
            <button
              onClick={() => setText('')}
              className="px-3 py-2 rounded-md text-sm"
              style={{ background: 'transparent', color: '#CFEFE0', border: '1px solid rgba(255,255,255,0.03)' }}
            >
              Clear
            </button>
            <button
              onClick={saveNote}
              disabled={saving || !text.trim()}
              className="px-4 py-2 rounded-md text-sm font-semibold"
              style={{
                background: saving ? '#1AA06D' : '#135E3D',
                color: '#04210D',
                opacity: saving || !text.trim() ? 0.9 : 1
              }}
            >
              {saving ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold" style={{ color: '#E6F7EE' }}>Existing Private Notes</h2>

        {loading ? (
          <div className="mt-3 p-4 rounded-md text-sm text-[#CDEDD7]" style={{ background: 'rgba(255,255,255,0.01)' }}>Loading...</div>
        ) : notes.length === 0 ? (
          <div className="mt-3 p-4 rounded-md text-sm text-[#9FBFAD]" style={{ background: 'rgba(255,255,255,0.01)' }}>No private notes.</div>
        ) : (
          <ul className="mt-3 space-y-3">
            {notes.map(n => {
              const time = n.timestamp ? new Date(n.timestamp).toLocaleString() : (n.createdAt ? new Date(n.createdAt).toLocaleString() : '');
              const author = n.author || (n.by || 'You');
              const initials = (author.split(' ').map(s => s[0]).join('').slice(0,2)).toUpperCase();
              return (
                <li key={n.id} className="p-4 rounded-lg" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold" style={{ background: 'linear-gradient(180deg,#0B3221,#135E3D)', color: '#E6F7EE' }}>
                        {initials}
                      </div>
                      <div>
                        <div className="text-sm font-medium" style={{ color: '#E6F7EE' }}>{n.title || (n.text ? (n.text.length > 80 ? `${n.text.slice(0,80)}…` : n.text) : 'Note')}</div>
                        <div className="text-xs mt-1" style={{ color: '#9FBFAD' }}>{author} · {time}</div>
                      </div>
                    </div>

                    <div className="text-xs text-[#CDEDD7]">{n.visibility || ''}</div>
                  </div>

                  {n.text && <div className="mt-3 text-sm" style={{ color: '#BFDFCB' }}>{n.text}</div>}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="text-xs text-[#9FBFAD] mt-2">
        Tip: Keep private notes factual and brief. Use them to record context for analysts — do not include sensitive personal data unless essential.
      </div>
    </div>
  );
}
