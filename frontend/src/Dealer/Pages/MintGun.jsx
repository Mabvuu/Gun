
// src/Dealer/MintGun.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function MintGun() {
  const navigate = useNavigate();

  const [serial, setSerial] = useState('');
  const [model, setModel] = useState('');
  const [make, setMake] = useState('');
  const [yearMade, setYearMade] = useState('');
  const [caliber, setCaliber] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState(null);
  const [importDoc, setImportDoc] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [showSuccess, setShowSuccess] = useState(false);
  const [mintedId, setMintedId] = useState(null);

  // Palette (matches Nav & Dashboard)
  const palette = {
    deepBlue: '#025067',
    teal: '#0B9FBD',
    plum: '#6C0E42',
    magenta: '#B31B6F',
    bgDark: '#071719',
    card: '#0e1e23',
    subtle: 'rgba(255,255,255,0.06)',
    text: '#E6EEF2',
    muted: 'rgba(255,255,255,0.6)',
  };

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const clearForm = () => {
    setSerial('');
    setModel('');
    setMake('');
    setYearMade('');
    setCaliber('');
    setManufacturer('');
    setNotes('');
    setPhoto(null);
    setImportDoc(null);
    setPhotoPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let res;
      if (photo || importDoc) {
        const formData = new FormData();
        formData.append('serial', serial);
        formData.append('model', model);
        formData.append('make', make);
        if (yearMade) formData.append('year_made', yearMade);
        formData.append('caliber', caliber);
        formData.append('manufacturer', manufacturer);
        formData.append('notes', notes);

        if (photo) {
          formData.append('photo', photo);
          formData.append('photo_name', photo.name);
        }
        if (importDoc) {
          formData.append('importDoc', importDoc);
          formData.append('import_doc_name', importDoc.name);
        }

        res = await axios.post('/api/dealer/guns/mint', formData, {
          headers: {
            Accept: 'application/json',
            // NOTE: do NOT set Content-Type here — browser will set multipart boundary
          },
        });
      } else {
        const jsonPayload = {
          serial,
          model,
          make,
          year_made: yearMade || null,
          caliber,
          manufacturer,
          notes,
        };
        res = await axios.post('/api/dealer/guns/mint', jsonPayload, {
          headers: { Accept: 'application/json' },
        });
      }

      const created = res.data?.gun ?? res.data?.created ?? res.data;
      const newId =
        created?.id ??
        created?._id ??
        created?.gunId ??
        created?.token_id ??
        res.data?.id ??
        res.data?._id;

      clearForm();

      if (newId) setMintedId(newId);
      setShowSuccess(true);
    } catch (err) {
      if (err.response) {
        setError(`Server error ${err.response.status}: ${JSON.stringify(err.response.data)}`);
        // keep alerts optional: small visual error is already shown
      } else if (err.request) {
        setError('No response from server. Check backend and proxy settings.');
      } else {
        setError(err.message || String(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-start justify-center py-10 px-4"
      style={{
        background: `linear-gradient(135deg, ${palette.deepBlue}0A, ${palette.plum}06)`,
        color: palette.text,
        fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
      }}
    >
      <div className="w-full max-w-2xl" style={{ padding: 12 }}>
        <div
          style={{
            background: palette.card,
            borderRadius: 14,
            padding: 20,
            boxShadow: '0 10px 30px rgba(2,6,23,0.5)',
            border: `1px solid ${palette.subtle}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h1 style={{ margin: 0, color: palette.text, fontSize: 20, fontWeight: 800 }}>Mint New Gun</h1>
              <div style={{ color: palette.muted, fontSize: 13, marginTop: 4 }}>Create an on-chain record for a gun</div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => {
                  clearForm();
                  setError(null);
                }}
                className="text-sm"
                style={{
                  background: 'transparent',
                  color: palette.text,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: `1px solid ${palette.subtle}`,
                  height: 38,
                }}
                title="Clear form"
                type="button"
              >
                Clear
              </button>
              <button
                onClick={() => navigate('/dealer/dashboard')}
                className="text-sm"
                style={{
                  background: palette.deepBlue,
                  color: '#fff',
                  padding: '8px 12px',
                  borderRadius: 8,
                  height: 38,
                  border: 'none',
                }}
                type="button"
              >
                Dashboard
              </button>
            </div>
          </div>

          {error && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: '#FFB4B4', background: 'rgba(255,0,0,0.04)', padding: 10, borderRadius: 8 }}>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Serial Number *"
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg focus:outline-none"
                style={{ border: `1px solid ${palette.subtle}`, background: 'transparent', color: palette.text }}
              />
              <input
                type="text"
                placeholder="Model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg focus:outline-none"
                style={{ border: `1px solid ${palette.subtle}`, background: 'transparent', color: palette.text }}
              />
              <input
                type="text"
                placeholder="Make"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                className="w-full px-3 py-2 rounded-lg focus:outline-none"
                style={{ border: `1px solid ${palette.subtle}`, background: 'transparent', color: palette.text }}
              />
              <input
                type="number"
                placeholder="Year Made"
                value={yearMade}
                onChange={(e) => setYearMade(e.target.value)}
                className="w-full px-3 py-2 rounded-lg focus:outline-none"
                style={{ border: `1px solid ${palette.subtle}`, background: 'transparent', color: palette.text }}
              />
              <input
                type="text"
                placeholder="Caliber"
                value={caliber}
                onChange={(e) => setCaliber(e.target.value)}
                className="w-full px-3 py-2 rounded-lg focus:outline-none"
                style={{ border: `1px solid ${palette.subtle}`, background: 'transparent', color: palette.text }}
              />
              <input
                type="text"
                placeholder="Manufacturer"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                className="w-full px-3 py-2 rounded-lg focus:outline-none"
                style={{ border: `1px solid ${palette.subtle}`, background: 'transparent', color: palette.text }}
              />
            </div>

            <textarea
              placeholder="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg focus:outline-none"
              rows={4}
              style={{ border: `1px solid ${palette.subtle}`, background: 'transparent', color: palette.text }}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: palette.muted }}>
                  Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                  className="block text-sm"
                  style={{ color: palette.text }}
                />
                {photoPreview && (
                  <div
                    className="mt-3 rounded-lg overflow-hidden"
                    style={{ width: 176, height: 128, border: `1px solid ${palette.subtle}`, background: '#071b1b' }}
                  >
                    <img src={photoPreview} alt="preview" className="object-cover w-full h-full" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: palette.muted }}>
                  Import Document
                </label>
                <input
                  type="file"
                  onChange={(e) => setImportDoc(e.target.files?.[0] ?? null)}
                  className="block text-sm"
                  style={{ color: palette.text }}
                />
                {importDoc && <div className="mt-2 text-sm" style={{ color: palette.muted }}>{importDoc.name}</div>}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-bold"
              style={{
                background: palette.magenta,
                color: '#fff',
                border: 'none',
                boxShadow: loading ? 'none' : `0 8px 20px rgba(179,27,111,0.12)`,
                opacity: loading ? 0.8 : 1,
              }}
            >
              {loading ? 'Minting…' : 'Mint Gun'}
            </button>
          </form>
        </div>
      </div>

      {/* Success modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0" style={{ background: 'rgba(2,6,23,0.6)' }} onClick={() => setShowSuccess(false)} />
          <div
            style={{
              width: '100%',
              maxWidth: 520,
              background: '#071819',
              borderRadius: 12,
              padding: 20,
              zIndex: 20,
              border: `1px solid ${palette.subtle}`,
              boxShadow: '0 18px 50px rgba(2,6,23,0.6)',
            }}
          >
            <div style={{ textAlign: 'center', color: palette.text }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: palette.text }}>Mint Successful</h2>
              <p style={{ color: palette.muted, marginTop: 8 }}>
                {mintedId ? `Gun created (ID: ${mintedId})` : 'Gun created.'}
              </p>

              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button
                  onClick={() => { setShowSuccess(false); navigate('/dealer/dashboard'); }}
                  style={{
                    flex: 1,
                    background: palette.magenta,
                    color: '#fff',
                    padding: '10px 12px',
                    borderRadius: 8,
                    fontWeight: 700,
                    border: 'none',
                  }}
                >
                  Proceed to dashboard
                </button>

                <button
                  onClick={() => {
                    if (mintedId) navigate(`/dealer/gun/${mintedId}`);
                    setShowSuccess(false);
                  }}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    color: palette.text,
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${palette.subtle}`,
                    fontWeight: 700,
                  }}
                >
                  View gun
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

