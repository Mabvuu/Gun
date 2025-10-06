// Police.jsx
import React, { useEffect, useState } from "react";

/**
 * Police.jsx
 * - Shows police stations (2 per town), approvals & declines, who is in charge.
 * - Can open station to see detailed actions (approvals/declines).
 * - Uses same shared simulated dataset on window.__SIM_STATE.
 */

function initSimIfNeeded() {
  return typeof window !== "undefined" && window.__SIM_STATE ? window.__SIM_STATE : null;
}

export default function Police() {
  const [sim, setSim] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);

  useEffect(() => {
    const s = initSimIfNeeded();
    if (!s) {
      // safety: if not present, try to create by rendering Applicants component somewhere else first.
      // But to be robust, create minimal fallback structure:
      window.__SIM_STATE = window.__SIM_STATE || { policeStations: [], policeActions: [], applicants: [] };
    }
    setSim(window.__SIM_STATE);
  }, []);

  if (!sim) return null;
  const stations = sim.policeStations || [];

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Police stations (simulated)</h2>
          <div className="text-sm text-gray-500">Stations: {stations.length}</div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {stations.map(ps => (
            <div key={ps.id} className="p-3 rounded border flex justify-between items-start bg-white">
              <div>
                <div className="font-semibold">{ps.name}</div>
                <div className="text-xs text-gray-500">{ps.town}, {ps.province}</div>
                <div className="text-xs mt-1">In charge: <strong>{ps.inCharge.name}</strong></div>
              </div>
              <div className="text-right">
                <div className="text-xs">Approvals: <span className="text-green-700 font-bold">{ps.approvals.length}</span></div>
                <div className="text-xs">Declines: <span className="text-red-700 font-bold">{ps.declines.length}</span></div>
                <div className="mt-2">
                  <button onClick={() => setSelectedStation(ps)} className="px-3 py-1 rounded border">Open</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* station modal */}
        {selectedStation && (
          <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 w-11/12 max-w-3xl shadow-lg">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-lg">{selectedStation.name}</div>
                  <div className="text-xs text-gray-500">{selectedStation.town}, {selectedStation.province}</div>
                  <div className="text-xs">In charge: {selectedStation.inCharge.name}</div>
                </div>
                <div><button onClick={()=>setSelectedStation(null)} className="px-2 py-1 rounded border">Close</button></div>
              </div>

              <div className="mt-4">
                <div className="text-sm font-semibold">Approvals ({selectedStation.approvals.length})</div>
                <div className="mt-2 space-y-2 max-h-48 overflow-auto">
                  {selectedStation.approvals.map(a => (
                    <div key={a.id} className="p-2 rounded border text-xs flex justify-between">
                      <div>{a.application} — Applicant {a.applicant}</div>
                      <div className="text-green-700 font-bold">APPROVED</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 text-sm font-semibold">Declines ({selectedStation.declines.length})</div>
                <div className="mt-2 space-y-2 max-h-48 overflow-auto">
                  {selectedStation.declines.map(d => (
                    <div key={d.id} className="p-2 rounded border text-xs flex justify-between">
                      <div>{d.application} — Applicant {d.applicant} — {d.reason}</div>
                      <div className="text-red-700 font-bold">DECLINED</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
