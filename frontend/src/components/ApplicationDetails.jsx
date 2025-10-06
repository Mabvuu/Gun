// frontend/src/components/ApplicationDetails.jsx
import React from 'react';

/**
 * Props:
 * - application: object returned from GET /api/applications/:id
 */
export default function ApplicationDetails({ application }) {
  if (!application) return <div>Loading application...</div>;

  return (
    <div className="p-4 border rounded-md shadow-sm bg-white">
      <h2 className="text-xl font-semibold mb-2">{application.title}</h2>

      <div className="mb-3">
        <strong>Status:</strong> <span>{application.status}</span>
      </div>

      <div className="mb-3">
        <strong>Last updated:</strong> <span>{new Date(application.updatedAt).toLocaleString()}</span>
      </div>

      <div className="mb-4">
        <strong>Data:</strong>
        <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-2 rounded mt-1" style={{ maxHeight: 200, overflow: 'auto' }}>
          {JSON.stringify(application.data || {}, null, 2)}
        </pre>
      </div>

      <div className="mb-4">
        <strong>Sections (role additions):</strong>
        <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-2 rounded mt-1" style={{ maxHeight: 200, overflow: 'auto' }}>
          {JSON.stringify(application.sections || {}, null, 2)}
        </pre>
      </div>

      <div className="mb-4">
        <strong>Documents:</strong>
        <ul className="list-disc ml-6">
          {(application.documents || []).map((d, i) => (
            <li key={i}>
              {d.filename || d.url ? (
                <a href={d.url || '#'} target="_blank" rel="noreferrer">{d.filename || d.url}</a>
              ) : (
                <span>{JSON.stringify(d)}</span>
              )}
              <span className="text-gray-500 ml-2 text-sm">by {d.uploadedBy}</span>
            </li>
          ))}
          {(!application.documents || application.documents.length === 0) && <li className="text-gray-500">No documents</li>}
        </ul>
      </div>

      <div>
        <strong>History:</strong>
        <ol className="ml-4 list-decimal">
          {(application.history || []).slice().reverse().map((h, i) => (
            <li key={i} className="mb-1">
              <div className="text-sm">
                <strong>{h.role}</strong> — {h.by} &nbsp;
                <span className="text-gray-500">({new Date(h.at).toLocaleString()})</span>
              </div>
              <div className="text-sm text-gray-700">
                {h.from} → {h.to} {h.comment ? ` — "${h.comment}"` : ''}
              </div>
            </li>
          ))}
          {(!application.history || application.history.length === 0) && <li className="text-gray-500">No history</li>}
        </ol>
      </div>
    </div>
  );
}
