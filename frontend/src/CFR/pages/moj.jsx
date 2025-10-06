// MOJ.jsx
import React, { useEffect, useState } from "react";

/**
 * MOJ.jsx
 * - Shows MOJ overview per province/town (simulated)
 * - Lists all applications that went through MOJ (simulated dataset)
 */

export default function MOJ() {
  const [sim, setSim] = useState(null);

  useEffect(() => {
    setSim(window.__SIM_STATE || null);
  }, []);

  if (!sim) return null;

  const provinces = Array.from(new Set(sim.applicants.map(a=>a.province)));
  // MOJ record summary
  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">MOJ — Application Log (simulated)</h2>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {provinces.map(p => (
            <div key={p} className="p-3 rounded border bg-white">
              <div className="font-semibold">{p} — MOJ Rep</div>
              <div className="text-xs text-gray-500">MOJ: {`MOJ-${p}`}</div>
            </div>
          ))}
        </div>

        <div>
          <h3 className="font-semibold">Applications processed</h3>
          <div className="mt-2 space-y-2">
            {sim.mojRecords.slice(0, 80).map(r => (
              <div key={r.id + r.applicantId} className="p-2 rounded border bg-white flex justify-between">
                <div>
                  <div className="font-semibold">{r.id} — {r.applicantName}</div>
                  <div className="text-xs text-gray-500">Status: {r.approved ? "Approved" : "Declined"} — Reason: {r.reason}</div>
                </div>
                <div className="text-xs">{new Date(r.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
