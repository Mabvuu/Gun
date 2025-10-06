import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function VerifyLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    axios.get('/api/officer/verify/logs')
      .then(res => mounted && setLogs(res.data || []))
      .catch(err => console.error(err))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4">Verify Log</h1>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : logs.length === 0 ? (
        <div className="text-gray-500">No verify logs yet.</div>
      ) : (
        <ul className="space-y-3 max-w-3xl">
          {logs.map(l => (
            <li key={l.id} className="p-3 bg-white border rounded flex justify-between items-start">
              <div>
                <div className="text-sm text-gray-500">{new Date(l.timestamp).toLocaleString()}</div>
                <div className="font-medium">{l.officerName} @ {l.station}</div>
                <div className="text-sm text-gray-700 mt-1">Serial: {l.serialMasked}</div>
                <div className="text-sm text-gray-500">{l.notes}</div>
              </div>
              <div className="text-xs text-gray-400">{l.result}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
