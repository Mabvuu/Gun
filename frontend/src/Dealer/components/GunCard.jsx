// Dealer/components/GunCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';

export default function GunCard({ gun }) {
  // gun expected shape from /api/dealer/guns
  return (
    <div className="bg-white border rounded-lg p-3 shadow-sm w-52">
      <div className="h-36 flex items-center justify-center mb-2 bg-gray-50 overflow-hidden rounded">
        {gun.photo ? (
          <img src={gun.photo} alt="gun" className="object-contain h-full" />
        ) : (
          <div className="text-sm text-gray-400">No image</div>
        )}
      </div>

      <div className="text-xs text-gray-500">Serial</div>
      <div className="font-medium mb-1">****{(gun.serial || '').slice(-4)}</div>

      <div className="text-xs text-gray-500">Status</div>
      <div className="text-sm mb-3">{gun.status || 'unknown'}</div>

      <Link
        to={`/dealer/gun/${gun.id}`}
        className="inline-block text-sm text-indigo-600 hover:underline"
      >
        View Details
      </Link>
    </div>
  );
}
