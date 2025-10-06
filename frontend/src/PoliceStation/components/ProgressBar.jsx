import React from 'react';

export default function ProgressBar({ progress = 0 }) {
  return (
    <div style={{ background: '#eee', width: '100%', height: 14, borderRadius: 7 }}>
      <div style={{
        width: `${Math.max(0, Math.min(100, progress))}%`,
        height: '100%',
        background: 'green',
        borderRadius: 7
      }} />
    </div>
  );
}
