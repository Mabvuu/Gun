import React from 'react';

/**
 * props:
 *  - timeline: [{ timestamp, actor, event, details, fileHash? }]
 */
export default function RecordTimeline({ timeline = [] }) {
  if (!timeline || timeline.length === 0) {
    return <div className="text-gray-500">No timeline events.</div>;
  }

  return (
    <div className="space-y-3">
      {timeline.map((t, i) => (
        <div key={i} className="p-3 border rounded bg-white">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs text-gray-400">{new Date(t.timestamp).toLocaleString()}</div>
              <div className="font-medium">{t.actor} — {t.event}</div>
              <div className="text-sm text-gray-700 mt-1">{t.details}</div>
            </div>
            {t.fileHash && (
              <div className="text-xs text-right text-gray-500">
                <div>File hash</div>
                <div className="break-all">{t.fileHash}</div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
