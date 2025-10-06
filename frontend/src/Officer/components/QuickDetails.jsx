import React from 'react';

/**
 * props:
 *  - details: {
 *      serialMasked, licenseExpiry, lastInspection, ownerName (minimal)
 *      flagReason (optional)
 *    }
 */
export default function QuickDetails({ details = {} }) {
  if (!details) return null;
  return (
    <div className="mt-4 bg-white p-4 rounded shadow">
      <div className="flex justify-between items-center">
        <div>
          <div className="text-xs text-gray-500">Serial</div>
          <div className="text-lg font-mono font-semibold">{details.serialMasked || '****'}</div>
        </div>

        <div>
          <div className="text-xs text-gray-500">License expiry</div>
          <div className="text-lg font-semibold">{details.licenseExpiry || '—'}</div>
        </div>

        <div>
          <div className="text-xs text-gray-500">Last inspection</div>
          <div className="text-lg font-semibold">{details.lastInspection || '—'}</div>
        </div>
      </div>

      <div className="mt-3 text-sm text-gray-700">
        <div><span className="text-gray-500">Owner:</span> {details.ownerName || 'Minimal info only'}</div>
        {details.flagReason && <div className="mt-2 text-sm text-red-600">Flag: {details.flagReason}</div>}
      </div>
    </div>
  );
}
