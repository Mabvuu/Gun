// src/Province/pages/ProvinceSim.jsx
import React, { useEffect, useState } from "react";

/**
 * ProvinceSim.jsx
 *
 * A simulation-only version of your real Province page.
 * - DOES NOT call the API (pure client-side)
 * - Mirrors the layout / classes of your real page so you can drop it in and visually test
 * - Enforces "one approved per token" rule (approving a record blocks other reports with same token)
 * - Shows fake files, dealer, receiver, notes, and a flow for Approve / Decline
 *
 * Copy this file into your project and route to it when you want a simulated preview.
 */

const initialApps = [
  {
    id: "APP-201",
    token: "TKN-5001",
    province: "Central",
    town: "Harare",
    dealerName: "Apex Armaments Ltd",
    applicantId: "Applicant-77",
    files: {
      file: "/assets/fake_app_201.pdf",
      endorsementFile: "/assets/fake_endorse_201.pdf",
      certificateFile: "/assets/fake_cert_201.pdf",
    },
    note: "Standard service pistol transfer for newly posted officer.",
    status: "pending",
    receiver: { name: "Officer T. Dube", badge: "B-4512", station: "Central" },
  },
  {
    id: "APP-202",
    token: "TKN-5002",
    province: "Central",
    town: "Chitungwiza",
    dealerName: "Frontline Supplies",
    applicantId: "Applicant-88",
    files: { file: "/assets/fake_app_202.pdf" },
    note: "Rifle procurement for specialised unit.",
    status: "approved", // already approved in simulation
    approvedBy: "Cmdr. Ndlovu",
    receiver: { name: "Cmdr. Ndlovu", badge: "C-001", station: "Regional HQ" },
  },
  {
    id: "APP-203",
    token: "TKN-5003",
    province: "Central",
    town: "Gweru",
    dealerName: "Metro Defence",
    applicantId: "Applicant-62",
    files: {},
    note: "Demo firearm for community outreach (requires transport permit).",
    status: "info",
    receiver: { name: "Sgt. Chirwa", badge: "S-779", station: "Community Outreach" },
  },
  {
    id: "APP-204",
    token: "TKN-5004",
    province: "Southern",
    town: "Masvingo",
    dealerName: "Apex Armaments Ltd",
    applicantId: "Applicant-90",
    files: {},
    note: "Large refurbishment order attached (not a firearm transfer).",
    status: "rejected",
    receiver: { name: "Station Armoury", badge: "", station: "Masvingo" },
  },
  {
    id: "APP-205",
    token: "TKN-5001", // same token as APP-201 (to show uniqueness conflict)
    province: "Central",
    town: "Harare",
    dealerName: "Apex Armaments Ltd",
    applicantId: "Applicant-99",
    files: {},
    note: "Administrative follow-up tied to TKN-5001; missing receiver signature.",
    status: "pending",
    receiver: { name: "Officer T. Dube", badge: "B-4512", station: "Central" },
  },
];

function fileUrl(file) {
  if (!file) return null;
  if (String(file).startsWith("http")) return file;
  return file; // in simulation, assume assets are served from public
}

// check whether a token is already approved on a different application
function tokenAlreadyApprovedElsewhere(apps, token, currentId = null) {
  return apps.some((a) => a.token === token && a.status === "approved" && a.id !== currentId);
}

export default function ProvinceSim() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [officerId, setOfficerId] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    // small delay to emulate load
    setLoading(true);
    const t = setTimeout(() => {
      setApps(initialApps.slice()); // copy
      setLoading(false);
    }, 350);
    return () => clearTimeout(t);
  }, []);

  async function viewApp(id) {
    setMessage(null);
    setSelected(null);
    // simulate fetch delay
    setTimeout(() => {
      const app = apps.find((a) => a.id === id) || null;
      setSelected(app);
      setOfficerId("");
      setNote("");
    }, 120);
  }

  async function approve(id) {
    setActionLoading(true);
    setMessage(null);
    try {
      const app = apps.find((a) => a.id === id);
      if (!app) throw new Error("Application not found");
      // uniqueness check
      if (tokenAlreadyApprovedElsewhere(apps, app.token, id)) {
        throw new Error(`Token ${app.token} is already approved on another application. Only one approval per token is allowed.`);
      }

      // simulate server processing
      await new Promise((r) => setTimeout(r, 350));

      setApps((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "approved", approvedBy: officerId || "SimOfficer" } : a))
      );
      setMessage(`Application ${id} approved (simulated).`);
      // refresh selected with updated record
      setSelected((s) => (s && s.id === id ? { ...s, status: "approved", approvedBy: officerId || "SimOfficer" } : s));
    } catch (err) {
      setMessage(err.message || "Approve failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function decline(id) {
    setActionLoading(true);
    setMessage(null);
    try {
      await new Promise((r) => setTimeout(r, 250));
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status: "rejected" } : a)));
      setMessage(`Application ${id} declined (simulated).`);
      // close detail pane
      setSelected(null);
    } catch (err) {
      setMessage(err.message || "Decline failed");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-gray-100 p-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Province Dashboard — Simulation</h1>
        <p className="text-gray-500 mt-1">This is a visual simulation. No API calls are made.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Applications */}
        <div className="backdrop-blur-xl bg-white/70 shadow-xl rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Pending Applications (simulation)</h3>
            <div className="text-sm text-gray-500">Total: {apps.length}</div>
          </div>

          {loading && <div className="text-sm text-gray-500 mt-2">Loading...</div>}
          {!loading && apps.length === 0 && <div className="text-sm text-gray-500 mt-3">No applications</div>}
          {apps.length > 0 && (
            <ul className="mt-4 space-y-3">
              {apps.map((a) => (
                <li
                  key={a.id}
                  className={`p-4 bg-white/90 border border-gray-100 rounded-xl flex justify-between items-center hover:shadow-lg hover:scale-[1.01] transition`}
                >
                  <div>
                    <div className="font-medium text-gray-900">ID {a.id} — Token: <span className="font-mono">{a.token}</span></div>
                    <div className="text-sm text-gray-600">
                      {a.province || "—"} / {a.town || "—"} — Dealer: {a.dealerName || "—"}
                      <span className="ml-3 px-2 py-0.5 text-xs rounded-full" style={{ background: a.status === "approved" ? "#d1fae5" : a.status === "rejected" ? "#fee2e2" : "#fff7ed" }}>
                        {a.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => viewApp(a.id)}
                      className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                    >
                      View
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Application Detail */}
        {selected ? (
          <div className="backdrop-blur-xl bg-white/80 shadow-xl rounded-2xl p-6 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">Application #{selected.id}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div className="space-y-2 text-sm text-gray-700">
                <p>
                  <span className="font-medium">Applicant:</span> {selected.applicantId}
                </p>
                <p>
                  <span className="font-medium">Dealer:</span> {selected.dealerName}
                </p>
                <p>
                  <span className="font-medium">Province / Town:</span> {selected.province} / {selected.town}
                </p>

                {selected.files?.file && (
                  <a href={fileUrl(selected.files.file)} target="_blank" rel="noreferrer" className="block text-indigo-600 hover:underline mt-2">
                    Applicant file
                  </a>
                )}
                {selected.files?.endorsementFile && (
                  <a href={fileUrl(selected.files.endorsementFile)} target="_blank" rel="noreferrer" className="block text-indigo-600 hover:underline">
                    Endorsement
                  </a>
                )}
                {selected.files?.certificateFile && (
                  <a href={fileUrl(selected.files.certificateFile)} target="_blank" rel="noreferrer" className="block text-indigo-600 hover:underline">
                    Police certificate
                  </a>
                )}

                <div className="mt-4 bg-gray-50/70 p-3 rounded-lg">
                  <span className="font-medium">Notes:</span> {selected.note || "—"}
                </div>

                <div className="mt-3 text-sm text-gray-600">
                  <div>
                    <strong>Receiver:</strong> {selected.receiver?.name || "—"}
                  </div>
                  {selected.approvedBy && (
                    <div className="mt-1 text-sm text-green-700">
                      <strong>Approved by:</strong> {selected.approvedBy}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium">Officer ID</label>
                <input
                  value={officerId}
                  onChange={(e) => setOfficerId(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-400"
                  placeholder="Officer identifier (sim)"
                />

                <label className="block text-sm font-medium mt-3">Note / Reason</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-400"
                />

                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => approve(selected.id)}
                    disabled={actionLoading || tokenAlreadyApprovedElsewhere(apps, selected.token, selected.id)}
                    className={`flex-1 px-4 py-2 text-white rounded-lg transition ${tokenAlreadyApprovedElsewhere(apps, selected.token, selected.id) ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"}`}
                    title={tokenAlreadyApprovedElsewhere(apps, selected.token, selected.id) ? `Token ${selected.token} is already approved elsewhere` : "Approve (sim)"}
                  >
                    {actionLoading ? "Processing..." : "Approve"}
                  </button>

                  <button
                    onClick={() => decline(selected.id)}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    {actionLoading ? "Processing..." : "Decline"}
                  </button>
                </div>

                {message && <div className="mt-3 text-sm text-gray-700">{message}</div>}

                {/* quick token-checker */}
                <div className="mt-4 text-sm text-gray-500 p-3 rounded-lg bg-gray-50">
                  <div>
                    <strong>Token:</strong> <span className="font-mono">{selected.token}</span>
                  </div>
                  <div>
                    <strong>Any other approved app with this token?</strong>{" "}
                    {tokenAlreadyApprovedElsewhere(apps, selected.token, selected.id) ? (
                      <span className="text-red-600 font-semibold">Yes — approval blocked</span>
                    ) : (
                      <span className="text-green-700 font-semibold">No — safe to approve</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="backdrop-blur-xl bg-white/80 shadow-xl rounded-2xl p-6 border border-gray-200">
            <div className="text-center text-gray-500">Select an application to view details (simulation)</div>
          </div>
        )}
      </div>
    </div>
  );
}
