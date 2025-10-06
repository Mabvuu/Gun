import React from 'react';
import { Link } from 'react-router-dom';

export default function ApplicationCard({ app }) {
  return (
    <div className="border rounded-md p-4 bg-white shadow-sm flex justify-between items-center">
      <div className="space-y-1">
        <div className="text-xs text-gray-500">App ID: <span className="font-medium">{app.id}</span></div>
        <div className="text-base font-semibold">{app.applicantName}</div>
        <div className="text-sm text-gray-600">Station: {app.station} · District: {app.district}</div>
        <div className="text-sm text-gray-500">Serial: ****{(app.gunSerial || '').slice(-4)}</div>
      </div>
      <div>
        <Link to={`/province/application/${app.id}`}>
          <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Open</button>
        </Link>
      </div>
    </div>
  );
}
