// src/pages/Analytics.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);

  useEffect(() => {
    let mounted = true;
    axios
      .get('/api/intel/analytics/summary')
      .then(res => {
        if (!mounted) return;
        setStats(res.data || null);
      })
      .catch(err => {
        console.error(err);
        if (mounted) setStats(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const exportReport = async (type = 'summary') => {
    try {
      setExporting(type);
      const res = await axios.get(`/api/intel/analytics/export`, {
        params: { type },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `intel-analytics-${type}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Export failed', err);
      alert('Export failed');
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 min-h-[240px] flex items-center justify-center" style={{ backgroundColor: '#07120F' }}>
        <div className="text-sm text-[#CFEFE0]">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-lg flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(180deg,#0B3221,#135E3D)' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="3" y="3" width="6" height="6" rx="1" fill="#E6F7EE" opacity="0.95" />
              <rect x="15" y="3" width="6" height="6" rx="1" fill="#CFEFE0" opacity="0.85" />
              <rect x="3" y="15" width="6" height="6" rx="1" fill="#9FBFAD" opacity="0.85" />
              <rect x="15" y="15" width="6" height="6" rx="1" fill="#1AA06D" opacity="0.95" />
            </svg>
          </div>

          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: '#E6F7EE' }}>INTEL — Analytics</h1>
            <div className="text-sm" style={{ color: '#CFEFE0' }}>Summary of recent activity & quick exports</div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => exportReport('summary')}
            disabled={exporting}
            className="px-4 py-2 rounded-md font-semibold"
            style={{
              background: exporting === 'summary' ? '#1AA06D' : '#135E3D',
              color: '#04210D'
            }}
          >
            {exporting === 'summary' ? 'Exporting...' : 'Export Summary'}
          </button>
          <button
            onClick={() => exportReport('full')}
            disabled={exporting}
            className="px-4 py-2 rounded-md font-semibold"
            style={{
              background: exporting === 'full' ? '#1AA06D' : 'transparent',
              color: '#CFEFE0',
              border: '1px solid rgba(255,255,255,0.04)'
            }}
          >
            {exporting === 'full' ? 'Exporting...' : 'Export Full'}
          </button>
        </div>
      </div>

      {!stats ? (
        <div className="p-6 rounded-lg" style={{ background: 'linear-gradient(180deg,#09110D,#0D3A27)' }}>
          <div className="text-sm text-[#CDEDD7]">No analytics data available.</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="p-4 rounded-lg shadow" style={{ background: 'linear-gradient(180deg,#0B3221,#135E3D)' }}>
              <div className="text-xs text-[#CDEDD7]">Records (last 30d)</div>
              <div className="mt-2 text-3xl font-bold" style={{ color: '#E6F7EE' }}>{stats.last30Days ?? 0}</div>
              <div className="text-xs mt-1 text-[#9FBFAD]">{stats.changePercent30d ? `${stats.changePercent30d}% vs prev` : '\u2014'}</div>
            </div>

            <div className="p-4 rounded-lg shadow" style={{ background: 'linear-gradient(180deg,#09110D,#0D3A27)' }}>
              <div className="text-xs text-[#CDEDD7]">Unique nationals</div>
              <div className="mt-2 text-3xl font-bold" style={{ color: '#E6F7EE' }}>{stats.uniqueNationalIds ?? 0}</div>
              <div className="text-xs mt-1 text-[#9FBFAD]">{stats.uniqueChange ? `${stats.uniqueChange}% change` : '\u2014'}</div>
            </div>

            <div className="p-4 rounded-lg shadow" style={{ background: 'linear-gradient(180deg,#081A12,#0B3221)' }}>
              <div className="text-xs text-[#CDEDD7]">Active alerts</div>
              <div className="mt-2 text-3xl font-bold" style={{ color: '#E6F7EE' }}>{stats.activeWarnings ?? 0}</div>
              <div className="text-xs mt-1 text-[#9FBFAD]">Critical: {stats.critical ?? 0}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg" style={{ background: 'linear-gradient(180deg,#09110D,#0D3A27)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-[#CDEDD7]">Top locations (last 30d)</div>
                  <div className="mt-2 text-sm font-medium" style={{ color: '#E6F7EE' }}>
                    {Array.isArray(stats.topLocations) && stats.topLocations.length
                      ? stats.topLocations.map((t, i) => (
                          <div key={i} className="flex items-center justify-between py-1">
                            <div className="text-sm">{t.name}</div>
                            <div className="text-xs text-[#9FBFAD]">{t.count}</div>
                          </div>
                        ))
                      : <div className="text-sm text-[#9FBFAD]">No data</div>}
                  </div>
                </div>
                <div className="text-xs text-[#CDEDD7]">view</div>
              </div>
            </div>

            <div className="p-4 rounded-lg" style={{ background: 'linear-gradient(180deg,#0B3221,#135E3D)' }}>
              <div className="text-xs text-[#CDEDD7]">Recent notes (latest)</div>
              <div className="mt-2 space-y-2">
                {Array.isArray(stats.recentNotes) && stats.recentNotes.length ? (
                  stats.recentNotes.slice(0, 6).map((n, i) => (
                    <div key={i} className="p-2 rounded" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium" style={{ color: '#E6F7EE' }}>{n.summary || 'Note'}</div>
                        <div className="text-xs text-[#9FBFAD]">{n.time ?? ''}</div>
                      </div>
                      <div className="text-xs mt-1" style={{ color: '#BFDFCB' }}>{n.body ? (n.body.length > 120 ? `${n.body.slice(0, 120)}…` : n.body) : ''}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-[#9FBFAD]">No recent notes</div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ background: 'linear-gradient(180deg,#081A12,#0B3221)' }}>
            <div>
              <div className="text-xs text-[#CDEDD7]">Quick tips</div>
              <div className="mt-1 text-sm" style={{ color: '#BFDFCB' }}>
                Monitor spikes, attach evidence to notes, and escalate critical items immediately.
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-md font-medium" style={{ backgroundColor: '#135E3D', color: '#04210D' }}>
                Refresh
              </button>
              <button onClick={() => navigateToReports()} className="px-4 py-2 rounded-md font-medium" style={{ background: 'transparent', color: '#CFEFE0', border: '1px solid rgba(255,255,255,0.04)' }}>
                Open Reports
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // local helper (keeps main JSX tidy)
  function navigateToReports() {
    window.location.href = '/intel/reports';
  }
}
