// frontend/src/Club/pages/UploadMembership.jsx
import React, { useState, useRef } from 'react';
import axios from 'axios';

const COLORS = {
  gold: '#DAA112',
  sage: '#809276',
  olive: '#666E51',
  deepTeal: '#10383A',
  slate: '#768886'
};

/**
 * Improved UploadMembership:
 * - Uses your color palette
 * - Drag & drop area with visual state
 * - Image preview (or file icon for PDFs)
 * - Upload progress bar + animated micro-copy
 * - Simple validation and friendly messages
 */
export default function UploadMembership() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null); // data URL or null
  const [appId, setAppId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [pct, setPct] = useState(0);
  const [msg, setMsg] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const ACCEPTED = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

  function resetState() {
    setFile(null);
    setPreview(null);
    setPct(0);
    setMsg(null);
    setUploading(false);
  }

  function handleFilePicked(f) {
    if (!f) return;
    if (!ACCEPTED.includes(f.type) && !f.name.endsWith('.pdf')) {
      setMsg('Only PDF or image files (png/jpg/webp) are allowed.');
      return;
    }
    setFile(f);
    setMsg(null);

    // image preview for images; for pdf show null and show icon
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) handleFilePicked(f);
  };

  const handleFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) handleFilePicked(f);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (!appId.trim()) {
      setMsg('Application ID is required.');
      return;
    }
    if (!file) {
      setMsg('Please select a PDF or image to upload.');
      return;
    }

    setUploading(true);
    setPct(0);

    const fd = new FormData();
    fd.append('letter', file);
    fd.append('applicationId', appId.trim());

    try {
      await axios.post('/api/sportsclub/letters/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const p = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setPct(p);
        },
        timeout: 120000
      });

      setMsg('✅ Letter uploaded and attached.');
      // small success sparkle (reset after short delay)
      setTimeout(() => {
        resetState();
        setAppId('');
      }, 900);
    } catch (err) {
      console.error(err);
      setMsg(err?.response?.data?.error || 'Upload failed — try again.');
    } finally {
      setUploading(false);
      setPct(0);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      {/* header */}
      <div
        className="rounded-lg p-5 mb-6"
        style={{
          background: `linear-gradient(90deg, ${COLORS.deepTeal}, ${COLORS.sage})`,
          color: 'white',
          boxShadow: '0 10px 30px rgba(16,56,58,0.12)'
        }}
      >
        <div className="flex items-center gap-4">
          <div
            aria-hidden
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24
            }}
          >
            📨
          </div>
          <div>
            <h1 className="text-xl font-bold">Upload Membership Letter</h1>
            <p className="text-sm opacity-90 mt-1">
              Attach a letter to an application — PDF or image. Files are validated before upload.
            </p>
          </div>
        </div>
      </div>

      {/* form card */}
      <form onSubmit={handleUpload} className="bg-white rounded-lg shadow px-5 py-6 space-y-4">
        {/* App ID */}
        <div>
          <label className="block text-sm font-semibold mb-2" htmlFor="appId">Application ID</label>
          <input
            id="appId"
            value={appId}
            onChange={e => setAppId(e.target.value)}
            className="w-full px-3 py-2 rounded border"
            placeholder="Enter application ID to attach to"
            disabled={uploading}
            aria-required
          />
        </div>

        {/* drag & drop */}
        <div>
          <label className="block text-sm font-semibold mb-2">Letter (PDF / image)</label>

          <div
            onDragOver={(e)=>{ e.preventDefault(); setDragOver(true); }}
            onDragLeave={(e)=>{ e.preventDefault(); setDragOver(false); }}
            onDrop={handleDrop}
            onClick={()=>inputRef.current && inputRef.current.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e)=>{ if (e.key === 'Enter' || e.key === ' ') inputRef.current && inputRef.current.click(); }}
            className="rounded-lg p-4 border-dashed cursor-pointer flex items-center gap-4"
            style={{
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: dragOver ? COLORS.gold : COLORS.slate,
              background: dragOver ? 'rgba(218,161,18,0.04)' : '#fff'
            }}
            aria-label="Drop file here or click to select"
          >
            <div style={{ width: 84, height: 84, borderRadius: 10, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', border: `1px solid ${COLORS.subtle || 'rgba(0,0,0,0.04)'}` }}>
              {preview ? (
                <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ textAlign: 'center', padding: 8 }}>
                  <div style={{ fontSize: 30 }}>📄</div>
                  <div style={{ fontSize: 12, color: '#666' }}>{file ? file.name : 'PDF / Image'}</div>
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="font-medium">{file ? file.name : 'Drop file here or click to browse'}</div>
              <div className="text-sm text-[rgba(0,0,0,0.6)] mt-1">
                Allowed: PDF, PNG, JPG, WEBP — max 10 MB
              </div>

              {/* subtle micro-interaction */}
              <div className="mt-3 text-sm" style={{ color: '#444' }}>
                <span style={{ display: 'inline-block', padding: '6px 10px', borderRadius: 20, background: 'rgba(16,56,58,0.04)', marginRight: 8, fontSize: 12 }}>
                  Tip: Drag from your desktop
                </span>
                <span style={{ fontSize: 12, color: '#666' }}>Click the area to select a file</span>
              </div>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept=".pdf,image/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />
          </div>
        </div>

        {/* progress & actions */}
        {uploading && (
          <div className="w-full bg-[rgba(0,0,0,0.06)] rounded-full h-3 overflow-hidden">
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${COLORS.gold}, ${COLORS.sage})`,
                transition: 'width 200ms linear'
              }}
            />
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={uploading}
            className="px-4 py-2 rounded-md font-semibold"
            style={{
              background: COLORS.gold,
              color: '#000',
              boxShadow: '0 8px 28px rgba(218,161,18,0.12)'
            }}
          >
            {uploading ? `Uploading… ${pct}%` : 'Upload & Attach'}
          </button>

          <button
            type="button"
            onClick={() => { setFile(null); setPreview(null); setMsg(null); }}
            disabled={uploading}
            className="px-4 py-2 rounded-md"
            style={{ background: COLORS.slate, color: 'white' }}
          >
            Clear
          </button>

          <div className="ml-auto text-sm" style={{ color: '#555' }}>
            <span style={{ fontWeight: 600, color: COLORS.deepTeal }}>{file ? (Math.round((file.size||0)/1024) + ' KB') : 'No file'}</span>
          </div>
        </div>

        {/* message */}
        {msg && (
          <div className="text-sm mt-1" style={{ color: msg.startsWith('✅') ? COLORS.olive : '#b91c1c' }}>
            {msg}
          </div>
        )}

        {/* accessibility / small help */}
        <div className="text-xs text-[rgba(0,0,0,0.55)]">
          Uploads are sent to the server and attached to the application you specify. If you need help, contact support.
        </div>
      </form>
    </div>
  );
}
