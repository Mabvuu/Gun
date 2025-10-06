import React from 'react';

/**
 * props:
 *  - status: 'ok' | 'expired' | 'flagged' | 'unknown'
 */
export default function StatusIndicator({ status = 'unknown', className = '' }) {
  const map = {
    ok: { text: 'VALID', bg: 'bg-green-600' },
    expired: { text: 'EXPIRED', bg: 'bg-red-600' },
    flagged: { text: 'FLAGGED', bg: 'bg-yellow-500 text-black' },
    unknown: { text: 'UNKNOWN', bg: 'bg-gray-400' },
  };
  const s = map[status] || map.unknown;
  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${s.bg} ${className}`}>
      {s.text}
    </div>
  );
}
