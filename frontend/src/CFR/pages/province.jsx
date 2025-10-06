// src/CFR/pages/province.jsx
import React, { useEffect, useMemo, useState } from "react";

/**
 * province.jsx
 * - Shows provinces, towns, police under each province, controllers (2 per province),
 *   and applications that passed/failed under that province.
 * - Reads simulation from window.__SIM_STATE (must be initialized elsewhere).
 * - Uses Tailwind utility classes.
 */

export default function Province() {
  const [sim, setSim] = useState(null);

  useEffect(() => {
    // read existing simulation state (created by Applicants or the sim init)
    setSim(typeof window !== "undefined" ? window.__SIM_STATE || null : null);
  }, []);

  // derive provinces list and controllers; ensure 'controllers' is used below
  const summary = useMemo(() => {
    if (!sim) return { provinces: [], controllers: {} };
    const provinces = Array.from(new Set(sim.applicants.map(a => a.province))).sort();
    // create two controllers per province (simulated people)
    const controllers = {};
    provinces.forEach((p) => {
      controllers[p] = [
        { id: `CTRL-${p}-A`, name: `Controller A — ${p}` },
        { id: `CTRL-${p}-B`, name: `Controller B — ${p}` },
      ];
    });
    return { provinces, controllers };
  }, [sim]);

  if (!sim) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold">Province overview (no data)</h2>
          <p className="text-sm text-gray-600 mt-2">
            No simulation data available. Load the Applicants page (which initializes the fake dataset)
            or ensure <code>window.__SIM_STATE</code> exists.
          </p>
        </div>
      </div>
    );
  }

  const { provinces, controllers } = summary;
  const stations = sim.policeStations || [];
  const applicants = sim.applicants || [];

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Provinces — Overview (simulated)</h1>
          <div className="text-sm text-gray-500">Provinces: {provinces.length}</div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {provinces.map((prov) => {
            const provStations = stations.filter(s => s.province === prov);
            // collect applications for applicants in this province
            const appsInProv = applicants
              .filter(a => a.province === prov)
              .flatMap(a => a.applications.map(app => ({ ...app, applicantId: a.id, applicantName: a.name })));

            const accepted = appsInProv.filter(a => a.approved).length;
            const declined = appsInProv.length - accepted;

            return (
              <div key={prov} className="bg-white p-4 rounded-lg border shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-lg font-semibold">{prov}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Towns: {Array.from(new Set(applicants.filter(a => a.province === prov).map(a => a.town))).join(", ") || "—"}
                    </div>

                    <div className="mt-3 text-sm">
                      <span className="inline-block mr-3">Stations: <strong>{provStations.length}</strong></span>
                      <span className="inline-block">Applications: <strong>{appsInProv.length}</strong></span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-gray-600">Controllers</div>
                    <div className="mt-2">
                      {controllers[prov].map(c => (
                        <div key={c.id} className="text-sm font-medium">{c.name}</div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-4">
                  <div className="p-3 rounded border bg-gray-50 flex-1">
                    <div className="text-xs text-gray-500">Accepted</div>
                    <div className="text-xl font-bold text-green-700">{accepted}</div>
                  </div>
                  <div className="p-3 rounded border bg-gray-50 flex-1">
                    <div className="text-xs text-gray-500">Declined</div>
                    <div className="text-xl font-bold text-red-600">{declined}</div>
                  </div>
                  <div className="p-3 rounded border bg-gray-50 w-48">
                    <div className="text-xs text-gray-500">Sample Stations</div>
                    <div className="mt-2 text-sm">
                      {provStations.slice(0, 4).map(s => (
                        <div key={s.id} className="mb-1">
                          <div className="font-medium">{s.name}</div>
                          <div className="text-xs text-gray-500">In charge: {s.inCharge?.name || "—"}</div>
                        </div>
                      ))}
                      {provStations.length === 0 && <div className="text-xs text-gray-500">None</div>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
