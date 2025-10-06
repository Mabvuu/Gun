// src/pages/RecordView.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import RecordTimeline from '../components/RecordTimeline';

export default function RecordView() {
  const { id } = useParams();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let mounted = true;
    axios.get(`/api/intel/records/${id}`)
      .then(res => mounted && setRecord(res.data))
      .catch(err => {
        console.error('Load record error', err);
        if (mounted) setRecord(null);
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [id]);

  const handleExport = async (format = 'json') => {
    setExporting(true);
    try {
      const res = await axios.get(`/api/intel/records/${id}/export`, {
        params: { format },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `record-${id}.${format === 'csv' ? 'csv' : 'json'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Export error', err);
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 min-h-[240px] flex items-center justify-center" style={{ backgroundColor: '#07120F' }}>
        <div className="text-sm text-[#CFEFE0]">Loading record...</div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="p-6 min-h-[200px] flex items-center justify-center" style={{ backgroundColor: '#07120F' }}>
        <div className="text-red-400">Record not found</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(180deg,#0B3221,#135E3D)' }}>
            <div className="text-white font-bold text-lg">R</div>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: '#E6F7EE' }}>Record #{record.id}</h1>
            <div className="text-sm mt-1" style={{ color: '#CFEFE0' }}>
              Region: <span className="font-medium">{record.region || '—'}</span> · Serial: <span className="font-medium">{record.serial || '—'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleExport('json')}
            disabled={exporting}
            className="px-3 py-2 rounded-md font-semibold text-sm"
            style={{
              background: exporting ? '#1AA06D' : '#135E3D',
              color: exporting ? '#04210D' : '#E6F7EE',
            }}
          >
            {exporting ? 'Exporting...' : 'Export JSON'}
          </button>

          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="px-3 py-2 rounded-md font-semibold text-sm"
            style={{
              background: exporting ? '#1AA06D' : 'transparent',
              color: '#CFEFE0',
              border: '1px solid rgba(255,255,255,0.04)'
            }}
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>

          <Link to={`/intel/annotate/${record.id}`}>
            <button className="px-3 py-2 rounded-md font-semibold text-sm" style={{ background: '#F6D365', color: '#08120A' }}>
              Private note
            </button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 p-4 rounded-lg" style={{ background: 'linear-gradient(180deg,#09110D,#0D3A27)' }}>
          <h2 className="text-lg font-semibold mb-3" style={{ color: '#E6F7EE' }}>Immutable Event Timeline</h2>
          <div className="rounded-md p-3" style={{ background: 'rgba(255,255,255,0.01)' }}>
            <RecordTimeline timeline={record.timeline} />
          </div>
        </section>

        <aside className="p-4 rounded-lg" style={{ background: 'linear-gradient(180deg,#081A12,#0B3221)' }}>
          <h2 className="text-sm font-semibold text-[#CDEDD7] mb-3">Summary</h2>
          <div className="text-sm text-[#BFDFCB] space-y-2">
            <div><strong>Status:</strong> <span className="ml-2">{record.status || '—'}</span></div>
            <div><strong>Created:</strong> <span className="ml-2">{record.createdAt ? new Date(record.createdAt).toLocaleString() : '—'}</span></div>
            <div><strong>Last updated:</strong> <span className="ml-2">{record.updatedAt ? new Date(record.updatedAt).toLocaleString() : '—'}</span></div>
            <div><strong>Region:</strong> <span className="ml-2">{record.region || '—'}</span></div>
            <div><strong>Serial:</strong> <span className="ml-2">{record.serial || '—'}</span></div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-[#CDEDD7] mb-2">Files & Hashes</h3>
            {(!record.files || record.files.length === 0) ? (
              <div className="text-sm text-[#9FBFAD]">No associated files.</div>
            ) : (
              <ul className="space-y-3">
                {record.files.map(f => (
                  <li key={f.id} className="p-3 rounded-md" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-[#E6F7EE]">{f.name}</div>
                        <div className="text-xs text-[#9FBFAD] mt-1">{f.uploadedAt ? new Date(f.uploadedAt).toLocaleString() : '—'}</div>
                      </div>
                      <div className="text-xs text-[#CDEDD7] text-right break-words max-w-[160px]">
                        <div className="mb-1">{String(f.hash).slice(0, 24)}{String(f.hash).length > 24 ? '…' : ''}</div>
                        <div className="flex gap-2 justify-end">
                          <a
                            href={f.url || `/api/files/${f.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs px-2 py-1 rounded font-medium"
                            style={{ background: 'rgba(255,255,255,0.03)', color: '#CFEFE0' }}
                          >
                            Open
                          </a>
                          <button
                            onClick={() => {
                              navigator.clipboard?.writeText(f.hash || '').catch(()=>{});
                            }}
                            className="text-xs px-2 py-1 rounded"
                            style={{ background: 'transparent', color: '#9FBFAD', border: '1px solid rgba(255,255,255,0.03)' }}
                          >
                            Copy hash
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
