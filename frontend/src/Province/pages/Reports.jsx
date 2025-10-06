// src/Province/pages/Reports.jsx
import React, { useEffect, useState } from "react";
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  EyeIcon,
  XMarkIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/solid";

/**
 * Simulated Reports page (guns context)
 * - Each report is tied to a `tokenId` (one token = one gun)
 * - Approval is unique per token: if a token is already approved on another report,
 *   attempting to approve a different report with the same token is blocked.
 * - Modal shows gun details (model, serial, caliber), dealer, receiver, tokenId, etc.
 *
 * This is a purely client-side simulation — no network calls.
 */

const initialStats = { pending: 3, approved: 1, rejected: 1, infoRequests: 1 };

const initialReports = [
  {
    id: "R-1001",
    tokenId: "TKN-5001",
    title: "Handgun transfer — Sector A",
    submittedBy: "Lt. Moyo",
    date: "2025-09-18",
    status: "pending",
    notes: "Urgent — transfer for certified officer",
    details:
      "Transfer of a service handgun to an active field officer after training completion.",
    gun: {
      model: "Sig P365",
      serial: "SIG-365-0001",
      caliber: "9mm",
      manufacturer: "SIG Sauer",
      notes: "Standard duty configuration",
    },
    dealer: {
      name: "Apex Armaments Ltd",
      license: "DLR-9982",
      contact: "apex@example.com",
    },
    receiver: {
      name: "Officer T. Dube",
      badge: "B-4512",
      station: "Central",
    },
  },
  {
    id: "R-1002",
    tokenId: "TKN-5002",
    title: "Rifle procurement — Field Unit",
    submittedBy: "Cpl. Banda",
    date: "2025-08-30",
    status: "approved", // Already approved -> blocks other approvals for token TKN-5002
    notes: "Approved by station commander.",
    details:
      "Procurement of a patrol rifle for specialised unit. Approved with logistics conditions.",
    gun: {
      model: "AR-15 Patrol",
      serial: "AR15-2002",
      caliber: "5.56mm",
      manufacturer: "Patriot Arms",
      notes: "Fitted with patrol optics",
    },
    dealer: {
      name: "Frontline Supplies",
      license: "DLR-4411",
      contact: "frontline@example.com",
    },
    receiver: {
      name: "Cmdr. Ndlovu",
      badge: "C-001",
      station: "Regional HQ",
    },
    approvedBy: "Cmdr. Ndlovu",
  },
  {
    id: "R-1003",
    tokenId: "TKN-5003",
    title: "Community outreach demo firearm",
    submittedBy: "Sgt. Chirwa",
    date: "2025-09-02",
    status: "info",
    notes: "Need clarification on insurance and transport.",
    details:
      "Temporary transfer of a certified demo pistol for community safety demo. Needs transport permit.",
    gun: {
      model: "Glock 19",
      serial: "GLK-190045",
      caliber: "9mm",
      manufacturer: "Glock",
      notes: "Demo configuration, inert rounds only for event",
    },
    dealer: {
      name: "Metro Defence",
      license: "DLR-3320",
      contact: "metro@example.com",
    },
    receiver: {
      name: "Sgt. Chirwa",
      badge: "S-779",
      station: "Community Outreach",
    },
  },
  {
    id: "R-1004",
    tokenId: "TKN-5004",
    title: "Station refurbishment - armoury audit",
    submittedBy: "Inspector K.",
    date: "2025-07-12",
    status: "rejected",
    notes: "Exceeds local budget allowances.",
    details:
      "Request to replace multiple armoury fixtures; rejected pending budget rework.",
    gun: {
      model: "N/A",
      serial: "N/A",
      caliber: "N/A",
      manufacturer: "N/A",
      notes: "Not a firearm transfer",
    },
    dealer: {
      name: "N/A",
      license: "N/A",
      contact: "",
    },
    receiver: {
      name: "Station Armoury",
      badge: "",
      station: "Central",
    },
  },
  {
    id: "R-1005",
    tokenId: "TKN-5001", // same token as R-1001 (example of another report touching same token)
    title: "Sizing / documentation for uniform transfer",
    submittedBy: "Admin Office",
    date: "2025-09-22",
    status: "pending",
    notes: "Associated with TKN-5001 but missing receiver signature.",
    details:
      "Administrative follow-up related to a transfer tied to token TKN-5001. Requires receiver signature.",
    gun: {
      model: "Sig P365",
      serial: "SIG-365-0001",
      caliber: "9mm",
      manufacturer: "SIG Sauer",
      notes: "Same pistol as R-1001 (token match)",
    },
    dealer: {
      name: "Apex Armaments Ltd",
      license: "DLR-9982",
      contact: "apex@example.com",
    },
    receiver: {
      name: "Officer T. Dube",
      badge: "B-4512",
      station: "Central",
    },
  },
];

function statusBadge(status) {
  switch (status) {
    case "approved":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
          <CheckCircleIcon className="h-4 w-4" />
          Approved
        </span>
      );
    case "rejected":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
          <XCircleIcon className="h-4 w-4" />
          Rejected
        </span>
      );
    case "info":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
          <InformationCircleIcon className="h-4 w-4" />
          Info
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
          <ClockIcon className="h-4 w-4" />
          Pending
        </span>
      );
  }
}

export default function Reports() {
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, infoRequests: 0 });
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // modal state
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [modalError, setModalError] = useState("");

  // filter (all / approved)
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    // simulate loading delay
    setLoading(true);
    const t = setTimeout(() => {
      setStats(initialStats);
      setReports(initialReports);
      setLoading(false);
    }, 350);
    return () => clearTimeout(t);
  }, []);

  // recompute counts from reports array (safe single source)
  const recomputeStats = (arr) => {
    return arr.reduce(
      (acc, r) => {
        if (r.status === "pending") acc.pending += 1;
        else if (r.status === "approved") acc.approved += 1;
        else if (r.status === "rejected") acc.rejected += 1;
        else if (r.status === "info") acc.infoRequests += 1;
        return acc;
      },
      { pending: 0, approved: 0, rejected: 0, infoRequests: 0 }
    );
  };

  // check whether a token is already approved on a different report
  const tokenAlreadyApprovedElsewhere = (tokenId, currentReportId = null) => {
    return reports.some((r) => r.tokenId === tokenId && r.status === "approved" && r.id !== currentReportId);
  };

  // update report status, ensuring token uniqueness for approvals
  function updateReportStatus(id, newStatus, actor = "SimUser") {
    // if trying to approve, enforce unique token approval
    if (newStatus === "approved") {
      const r = reports.find((x) => x.id === id);
      if (!r) return;
      if (tokenAlreadyApprovedElsewhere(r.tokenId, id)) {
        setModalError(`Token ${r.tokenId} is already approved on another report. Only one approved record per token is allowed.`);
        return;
      }
    }

    setReports((prev) => {
      const updated = prev.map((r) =>
        r.id === id ? { ...r, status: newStatus, approvedBy: newStatus === "approved" ? actor : r.approvedBy } : r
      );
      const counts = recomputeStats(updated);
      setStats(counts);
      // clear modal error if status change resolved conflict
      setModalError("");
      // update active if it's the same id
      setActive((a) => (a && a.id === id ? updated.find((x) => x.id === id) : a));
      return updated;
    });
  }

  // derived list based on filter
  const shownReports = reports.filter((r) =>
    filter === "all" ? true : filter === "approved" ? r.status === "approved" : r.status === filter
  );

  return (
    <div className="p-8 min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Province Reports — Guns (Simulation)</h1>
          <p className="text-sm text-gray-500 mt-1">
            Each report is tied to a token (gun). Only one approval per token is allowed.
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <button
            onClick={() => {
              // simple "refresh" simulation: shuffle statuses a little but preserve unique approvals
              setLoading(true);
              setTimeout(() => {
                // naive randomization that won't create extra approved tokens for same token
                setReports((prev) => {
                  const copy = prev.map((r) => ({ ...r }));
                  // randomly flip a pending to approved if token not already approved
                  const pendingIndices = copy.map((r, i) => (r.status === "pending" ? i : -1)).filter((i) => i >= 0);
                  if (pendingIndices.length > 0 && Math.random() > 0.5) {
                    const idx = pendingIndices[Math.floor(Math.random() * pendingIndices.length)];
                    const tok = copy[idx].tokenId;
                    const already = copy.some((x) => x.tokenId === tok && x.status === "approved");
                    if (!already) copy[idx].status = "approved";
                  }
                  // recompute counts
                  const counts = recomputeStats(copy);
                  setStats(counts);
                  return copy;
                });
                setLoading(false);
              }, 300);
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white shadow-sm text-sm font-medium text-gray-700 hover:shadow-md"
          >
            <ArrowPathIcon className="h-4 w-4" /> Simulate refresh
          </button>

          <div className="ml-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-md border px-3 py-2 bg-white text-sm"
            >
              <option value="all">All</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="info">Info Requests</option>
            </select>
          </div>
        </div>
      </div>

      {/* summary cards */}
      {loading ? (
        <div className="text-gray-500">Loading simulation...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="p-4 rounded-xl shadow-sm bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-amber-700">Pending</div>
                  <div className="text-2xl font-semibold text-amber-900">{stats.pending}</div>
                </div>
                <div className="p-2 bg-white rounded-full shadow">
                  <ClockIcon className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl shadow-sm bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-green-700">Approved</div>
                  <div className="text-2xl font-semibold text-green-900">{stats.approved}</div>
                </div>
                <div className="p-2 bg-white rounded-full shadow">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl shadow-sm bg-gradient-to-br from-red-50 to-red-100 border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-red-700">Rejected</div>
                  <div className="text-2xl font-semibold text-red-900">{stats.rejected}</div>
                </div>
                <div className="p-2 bg-white rounded-full shadow">
                  <XCircleIcon className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl shadow-sm bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-indigo-700">Info Requests</div>
                  <div className="text-2xl font-semibold text-indigo-900">{stats.infoRequests}</div>
                </div>
                <div className="p-2 bg-white rounded-full shadow">
                  <InformationCircleIcon className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
            </div>
          </div>

          {/* list of reports */}
          <div className="bg-white rounded-xl shadow border p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent reports</h2>
              <div className="text-sm text-gray-500">{shownReports.length} shown</div>
            </div>

            <div className="divide-y">
              {shownReports.map((r) => (
                <div
                  key={r.id}
                  className="py-3 flex items-start justify-between gap-4 hover:bg-gray-50 px-2 rounded"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 flex-shrink-0">
                      <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center text-gray-600 font-semibold">
                        {r.id.split("-")[1]}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-gray-900 truncate">{r.title}</div>
                        <div className="text-xs text-gray-400">{r.date}</div>
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {r.submittedBy} • {r.notes} • Token: <span className="font-mono">{r.tokenId}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div>{statusBadge(r.status)}</div>

                    <button
                      onClick={() => {
                        setActive(r);
                        setModalError("");
                        setOpen(true);
                      }}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white border text-sm shadow-sm hover:shadow-md"
                    >
                      <EyeIcon className="h-4 w-4" /> View
                    </button>
                  </div>
                </div>
              ))}

              {shownReports.length === 0 && (
                <div className="py-8 text-center text-gray-400">No reports matching this filter.</div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal — shows gun, dealer, receiver, token; enforces single approved token */}
      {open && active && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setOpen(false)} />

          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-auto z-10 overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{active.title}</div>
                <div className="text-xs text-gray-500">
                  {active.id} • {active.date} • {active.submittedBy}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Token: <span className="font-mono">{active.tokenId}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {statusBadge(active.status)}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-md hover:bg-gray-100"
                  aria-label="Close"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-700 font-medium">Gun details</div>
                  <div className="mt-2 text-sm text-gray-600 space-y-1">
                    <div>
                      <strong>Model:</strong> {active.gun.model}
                    </div>
                    <div>
                      <strong>Serial:</strong> <span className="font-mono">{active.gun.serial}</span>
                    </div>
                    <div>
                      <strong>Caliber:</strong> {active.gun.caliber}
                    </div>
                    <div>
                      <strong>Manufacturer:</strong> {active.gun.manufacturer}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{active.gun.notes}</div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-700 font-medium">Dealer & receiver</div>
                  <div className="mt-2 text-sm text-gray-600 space-y-1">
                    <div>
                      <strong>Dealer:</strong> {active.dealer.name} ({active.dealer.license})
                    </div>
                    {active.dealer.contact && (
                      <div>
                        <strong>Dealer contact:</strong> {active.dealer.contact}
                      </div>
                    )}
                    <div className="mt-2">
                      <strong>Receiver:</strong> {active.receiver.name} {active.receiver.badge && `• Badge: ${active.receiver.badge}`}
                    </div>
                    <div>
                      <strong>Station:</strong> {active.receiver.station}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-700">
                <strong>Details:</strong> {active.details}
              </div>

              <div className="text-sm text-gray-500">
                <strong>Notes:</strong> {active.notes}
              </div>

              {modalError && <div className="text-sm text-red-600 font-medium">{modalError}</div>}

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    updateReportStatus(active.id, "approved", "SimOfficer");
                  }}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-white shadow ${
                    tokenAlreadyApprovedElsewhere(active.tokenId, active.id)
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                  disabled={tokenAlreadyApprovedElsewhere(active.tokenId, active.id)}
                >
                  <CheckCircleIcon className="h-5 w-5" /> Approve
                </button>

                <button
                  onClick={() => {
                    updateReportStatus(active.id, "rejected", "SimOfficer");
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-red-600 text-white shadow hover:bg-red-700"
                >
                  <XCircleIcon className="h-5 w-5" /> Reject
                </button>

                <button
                  onClick={() => {
                    updateReportStatus(active.id, "info", "SimOfficer");
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-600 text-white shadow hover:bg-indigo-700"
                >
                  <InformationCircleIcon className="h-5 w-5" /> Request info
                </button>

                <button
                  onClick={() => {
                    // reset to pending
                    updateReportStatus(active.id, "pending", "SimOfficer");
                  }}
                  className="ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white border text-sm shadow-sm"
                >
                  Reset to pending
                </button>
              </div>
            </div>

            <div className="p-3 border-t flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded-md text-sm bg-gray-100 hover:bg-gray-200"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
