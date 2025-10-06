// INT.jsx
import React, { useEffect, useState } from "react";

/**
 * INT.jsx
 * - Shows the INT in charge per province (1 per province)
 * - Lists flagged applications that require INT review (with reasons)
 */

export default function INT() {
  const [sim, setSim] = useState(null);

  useEffect(() => {
    setSim(window.__SIM_STATE || null);
  }, []);

  if (!sim) return null;

  // create int per province from simulated provinces
  const provinces = Array.from(new Set(sim.applicants.map(a => a.province)));
  const ints = provinces.map(p => ({ province: p, int: { id: `INT-${p}`, name: `INT ${p}` } }));
  const flaggedApps = sim.applicants.flatMap(ap => ap.applications.filter(a => a.tokens && a.tokens.some(t=>t.flagged)).map(a=>({ ...a, applicant: ap.id, applicantName: ap.name })));

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">INT Dashboard (simulated)</h2>

        <div className="mb-4">
          <div className="text-sm text-gray-600">INT in charge per province</div>
          <div className="grid grid-cols-3 gap-3 mt-2">
            {ints.map(i=>(
              <div key={i.province} className="p-3 rounded border bg-white">
                <div className="font-semibold">{i.int.name}</div>
                <div className="text-xs text-gray-500">{i.province}</div>
                <div className="text-xs mt-2">Flagged requiring review: {flaggedApps.filter(f=>sim.applicants.find(ap=>ap.id===f.applicant).province===i.province).length}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-bold">Flagged applications (all)</h3>
          <div className="mt-2 space-y-2">
            {flaggedApps.length===0 && <div className="text-sm text-gray-500">No flagged applications</div>}
            {flaggedApps.map(f => (
              <div key={f.id} className="p-2 rounded border bg-white flex justify-between">
                <div>
                  <div className="font-semibold">{f.id} — Applicant {f.applicantName}</div>
                  <div className="text-xs text-gray-500">Submitted: {new Date(f.created_at).toLocaleString()}</div>
                  <div className="text-xs">Reason: {f.reason}</div>
                </div>
                <div className="text-xs text-yellow-800">INT review</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
