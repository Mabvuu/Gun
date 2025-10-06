// frontend/src/Club/components/DocList.jsx
import React, { useState } from 'react';

const COLORS = {
  gold: '#DAA112',
  sage: '#809276',
  olive: '#666E51',
  deepTeal: '#10383A',
  slate: '#768886',
  subtle: 'rgba(16,56,58,0.04)'
};

/**
 * DocList
 * - Uses the whole page width (stretched)
 * - Stacked "filing system" members (full-width rows)
 * - Documents are full-width stacked rows as well
 * - Small, non-bold typography
 *
 * Props:
 *  - docs: array of { id, name, url, uploadedAt, size, type, uploader, description }
 *  - onOpen(doc)
 *  - onDownload(doc)
 *  - onDelete(doc)
 *
 * NOTE: this file includes a visible simulated members list.
 */

const SIMULATED_MEMBERS = [
  {
    id: 'M-001',
    firstName: 'Thomas',
    lastName: 'Moyo',
    address: '12 Range Road, Harare',
    membershipNumber: 'HMC-2024-001',
    joinedAt: '2021-05-12',
    phone: '+263 77 123 4567',
    email: 'thomas.moyo@example.com',
    activity: 'Rifle, Clay target',
    notes: 'Prefers morning range sessions. Safety certified.'
  },
  {
    id: 'M-002',
    firstName: 'Angela',
    lastName: 'Chikore',
    address: '34 Bulawayo Lane, Bulawayo',
    membershipNumber: 'ZSG-2023-007',
    joinedAt: '2019-08-30',
    phone: '+263 78 234 9876',
    email: 'angela.chikore@example.com',
    activity: 'Pistol, Precision',
    notes: 'Instructor, available weekends.'
  },
  {
    id: 'M-003',
    firstName: 'Peter',
    lastName: 'Ndlovu',
    address: '7 Kariba Drive, Kariba',
    membershipNumber: 'KRC-2025-012',
    joinedAt: '2022-11-02',
    phone: '+263 71 555 1212',
    email: 'peter.ndlovu@example.com',
    activity: 'Tactical',
    notes: 'New member — needs orientation.'
  },
  {
    id: 'M-004',
    firstName: 'Sandra',
    lastName: 'Mashingaidze',
    address: '99 Highveld Ave, Mutare',
    membershipNumber: 'SPA-2020-045',
    joinedAt: '2020-02-14',
    phone: '+263 73 444 8899',
    email: 'sandra.m@example.com',
    activity: 'Long-range',
    notes: 'Competes regionally.'
  },
  {
    id: 'M-005',
    firstName: 'Kuda',
    lastName: 'Chirwa',
    address: '5 Lakeside Court, Victoria Falls',
    membershipNumber: 'LTC-2021-033',
    joinedAt: '2021-07-20',
    phone: '+263 79 998 7766',
    email: 'kuda.chirwa@example.com',
    activity: 'Rifle',
    notes: 'Volunteer marshal.'
  }
];

export default function DocList({ docs = [], onOpen, onDownload, onDelete }) {
  const [toast, setToast] = useState(null);
  const [preview, setPreview] = useState(null); // { url, name } or null
  const [members] = useState(SIMULATED_MEMBERS);
  const [memberModal, setMemberModal] = useState(null);

  function showToast(text) {
    setToast(text);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2200);
  }

  function handleCopyLink(url) {
    try {
      navigator.clipboard.writeText(url);
      showToast('Link copied to clipboard');
    } catch {
      showToast('Could not copy link');
    }
  }

  function handleDownload(d) {
    if (onDownload) return onDownload(d);
    downloadUrl(d.url);
    showToast('Download started');
  }

  function handleOpen(d) {
    if (onOpen) return onOpen(d);
    const rawType = (d.type || (d.name && extFromName(d.name)) || '').toLowerCase();
    const type = normalizeType(rawType);
    if (type === 'image') {
      setPreview({ url: d.url, name: d.name });
      return;
    }
    window.open(d.url, '_blank', 'noopener');
  }

  function openMember(member) {
    setMemberModal(member);
  }

  function attachToMember(member) {
    if (onOpen) onOpen({ member, type: 'member' });
    showToast(`Prepared to attach to ${member.firstName} ${member.lastName}`);
  }

  // Layout uses full page width and stretches rows
  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#f8fafb', padding: 20 }}>
      {/* Members filing system — full width stacked rows */}
      <section style={{ width: '100%', marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: COLORS.deepTeal, marginBottom: 8 }}>Members — filing system</div>
        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 6px 20px rgba(16,56,58,0.04)', overflow: 'hidden' }}>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {members.map((m) => (
              <li
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: '16px 20px',
                  borderBottom: `1px solid ${COLORS.subtle}`,
                  background: '#fff'
                }}
              >
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', minWidth: 0 }}>
                  <div
                    aria-hidden
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 8,
                      background: 'rgba(16,56,58,0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                      color: COLORS.deepTeal,
                      flexShrink: 0
                    }}
                  >
                    📁
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: '#222', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.firstName} {m.lastName}
                    </div>
                    <div style={{ fontSize: 12, color: '#555', marginTop: 6 }}>
                      {m.membershipNumber} • {m.activity}
                    </div>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 6, maxWidth: '80ch', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.address}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <button
                    onClick={() => openMember(m)}
                    style={{
                      background: COLORS.sage,
                      color: '#fff',
                      padding: '8px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    View
                  </button>

                  <button
                    onClick={() => attachToMember(m)}
                    style={{
                      background: 'transparent',
                      color: COLORS.deepTeal,
                      padding: '8px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      border: '1px solid rgba(16,56,58,0.06)',
                      cursor: 'pointer'
                    }}
                  >
                    Attach
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Documents list — full width stacked rows */}
      <section style={{ width: '100%' }}>
        <div style={{ fontSize: 13, color: COLORS.deepTeal, marginBottom: 8 }}>Documents</div>
        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 6px 20px rgba(16,56,58,0.04)', overflow: 'hidden' }}>
          {(!docs || docs.length === 0) ? (
            <div style={{ padding: 18, color: 'rgba(0,0,0,0.6)', fontSize: 13 }}>No documents</div>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {docs.map((d) => {
                const uploaded = d.uploadedAt ? relTime(d.uploadedAt) : '—';
                const size = typeof d.size === 'number' ? humanSize(d.size) : '—';
                const rawType = (d.type || (d.name && extFromName(d.name)) || '').toLowerCase();
                const type = normalizeType(rawType);
                const icon = fileIcon(type);

                return (
                  <li
                    key={d.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                      padding: '14px 20px',
                      borderBottom: `1px solid ${COLORS.subtle}`,
                      background: '#fff'
                    }}
                  >
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center', minWidth: 0 }}>
                      <div
                        aria-hidden
                        style={{
                          width: 54,
                          height: 54,
                          borderRadius: 8,
                          background: 'linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.01))',
                          border: `1px solid rgba(0,0,0,0.03)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 22,
                          flexShrink: 0
                        }}
                      >
                        {icon}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <div style={{ fontSize: 13, color: '#222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.name}>
                            {d.name}
                          </div>

                          <div
                            style={{
                              background: typeBadgeColor(type),
                              color: typeBadgeText(),
                              fontSize: 11,
                              padding: '4px 8px',
                              borderRadius: 999,
                              display: 'inline-block',
                              whiteSpace: 'nowrap'
                            }}
                            title={typeBadgeLabel(type)}
                          >
                            {typeBadgeLabel(type)}
                          </div>
                        </div>

                        <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>
                          <span>{uploaded}</span>
                          <span style={{ margin: '0 8px' }}>•</span>
                          <span>{size}</span>
                          <span style={{ margin: '0 8px' }}>•</span>
                          <span style={{ color: 'rgba(0,0,0,0.45)' }}>ID: {d.id}</span>
                        </div>

                        {d.description && (
                          <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(0,0,0,0.6)' }}>{d.description}</div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                      <button
                        onClick={() => handleOpen(d)}
                        style={{
                          background: COLORS.deepTeal,
                          color: '#fff',
                          padding: '8px 12px',
                          borderRadius: 6,
                          fontSize: 12,
                          border: 'none',
                          cursor: 'pointer'
                        }}
                        title="Open / preview"
                      >
                        Open
                      </button>

                      <button
                        onClick={() => handleDownload(d)}
                        style={{
                          background: COLORS.sage,
                          color: '#fff',
                          padding: '8px 12px',
                          borderRadius: 6,
                          fontSize: 12,
                          border: 'none',
                          cursor: 'pointer'
                        }}
                        title="Download"
                      >
                        Download
                      </button>

                      <button
                        onClick={() => handleCopyLink(d.url)}
                        style={{
                          background: '#f3f4f6',
                          color: '#111',
                          padding: '8px 10px',
                          borderRadius: 6,
                          fontSize: 12,
                          border: 'none',
                          cursor: 'pointer'
                        }}
                        title="Copy link"
                      >
                        Copy
                      </button>

                      {onDelete && (
                        <button
                          onClick={() => onDelete(d)}
                          style={{
                            background: COLORS.olive,
                            color: '#fff',
                            padding: '8px 12px',
                            borderRadius: 6,
                            fontSize: 12,
                            border: 'none',
                            cursor: 'pointer'
                          }}
                          title="Delete"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Member modal */}
      {memberModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setMemberModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(4,6,8,0.45)'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: 18,
              width: 'min(880px, 94vw)',
              boxShadow: '0 12px 40px rgba(16,56,58,0.12)',
              fontSize: 13
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: COLORS.deepTeal, fontSize: 14, marginBottom: 6 }}>
                  {memberModal.firstName} {memberModal.lastName}
                </div>
                <div style={{ color: '#444', fontSize: 12, marginBottom: 6 }}>{memberModal.membershipNumber}</div>
                <div style={{ color: '#666', fontSize: 12, marginBottom: 6 }}>{memberModal.address}</div>
                <div style={{ color: '#555', fontSize: 12 }}>Phone: {memberModal.phone}</div>
                <div style={{ color: '#555', fontSize: 12 }}>Email: {memberModal.email}</div>
                <div style={{ color: '#555', fontSize: 12, marginTop: 8 }}>Joined: {memberModal.joinedAt}</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
                <button
                  onClick={() => { attachToMember(memberModal); setMemberModal(null); }}
                  style={{ background: COLORS.gold, color: '#000', padding: '8px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12 }}
                >
                  Attach
                </button>
                <button
                  onClick={() => setMemberModal(null)}
                  style={{ background: COLORS.slate, color: '#fff', padding: '8px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12 }}
                >
                  Close
                </button>
              </div>
            </div>

            {memberModal.notes && (
              <div style={{ marginTop: 14, color: '#666', fontSize: 12 }}>
                <div style={{ color: '#444', marginBottom: 6 }}>Notes</div>
                <div>{memberModal.notes}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image preview modal */}
      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPreview(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(4,6,8,0.6)'
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 8, padding: 10, maxWidth: '92vw', maxHeight: '90vh' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 8 }}>
              <button
                onClick={() => { downloadUrl(preview.url); showTempMessage(setToast, 'Download started'); }}
                style={{ background: COLORS.sage, color: '#fff', padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12 }}
              >
                Download
              </button>
              <button onClick={() => setPreview(null)} style={{ background: '#f3f4f6', padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12 }}>Close</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: '86vw', maxHeight: '78vh' }}>
              <img src={preview.url} alt={preview.name} style={{ maxWidth: '100%', maxHeight: '78vh', objectFit: 'contain' }} />
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', right: 20, bottom: 20, background: '#fff', border: `1px solid ${COLORS.subtle}`, padding: '10px 14px', borderRadius: 8, boxShadow: '0 6px 18px rgba(16,56,58,0.06)', fontSize: 13 }}>
          {toast}
        </div>
      )}
    </div>
  );
}

/* ---------- helpers ---------- */

function showTempMessage(setter, text) {
  setter(text);
  window.clearTimeout(showTempMessage._t);
  showTempMessage._t = window.setTimeout(() => setter(null), 1800);
}

function humanSize(bytes) {
  if (bytes == null || Number.isNaN(Number(bytes))) return '—';
  const units = ['B','KB','MB','GB','TB'];
  let i = 0;
  let b = Number(bytes);
  while (b >= 1024 && i < units.length - 1) {
    b /= 1024;
    i += 1;
  }
  return `${b % 1 === 0 ? b : b.toFixed(1)} ${units[i]}`;
}

function relTime(val) {
  try {
    const d = new Date(val);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 10) return 'just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    if (diff < 60*86400) return `${Math.floor(diff/86400)}d ago`;
    return d.toLocaleDateString();
  } catch {
    return val;
  }
}

function extFromName(name = '') {
  const parts = String(name || '').split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

function downloadUrl(url) {
  if (!url) return;
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.download = '';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function normalizeType(type) {
  if (!type) return '';
  const t = String(type).toLowerCase();
  if (t.includes('pdf') || t === 'pdf') return 'pdf';
  if (t.includes('png') || t.includes('jpg') || t.includes('jpeg') || t.includes('webp') || t.startsWith('image')) return 'image';
  if (t.includes('zip')) return 'zip';
  if (t.includes('csv')) return 'csv';
  if (t.includes('doc') || t.includes('word') || t === 'docx') return 'doc';
  return t;
}

/* ----- file/type helpers ----- */
function fileIcon(type) {
  if (!type) return '📄';
  if (type === 'pdf') return '📕';
  if (type === 'image') return '🖼️';
  if (type === 'zip') return '🗜️';
  if (type === 'csv') return '📑';
  if (type === 'doc') return '📄';
  return '📄';
}

function typeBadgeLabel(type) {
  if (!type) return 'file';
  if (type === 'pdf') return 'PDF';
  if (type === 'image') return 'Image';
  if (type === 'zip') return 'ZIP';
  if (type === 'csv') return 'CSV';
  if (type === 'doc') return 'Doc';
  return String(type).toUpperCase();
}

function typeBadgeColor(type) {
  if (!type) return 'rgba(0,0,0,0.06)';
  if (type === 'pdf') return 'rgba(218,161,18,0.12)'; // gold tint
  if (type === 'image') return 'rgba(128,146,118,0.12)'; // sage tint
  if (type === 'csv') return 'rgba(102,110,81,0.12)'; // olive tint
  if (type === 'zip') return 'rgba(16,56,58,0.06)';
  return 'rgba(0,0,0,0.06)';
}

function typeBadgeText() {
  return '#000';
}
