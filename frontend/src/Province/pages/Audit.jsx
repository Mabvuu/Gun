// src/Province/pages/Audit.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  EyeIcon,
  UserCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";

/**
 * Audit — Decision History (pretty, uses the requested color palette)
 *
 * Colors (from your Nav):
 *  - licorice:  #1E0D0A
 *  - rosewood:  #550006
 *  - mahogany:  #BF353B
 *  - froly:     #EE666A
 *  - deepMoss:  #3D4421
 *
 * This component will try to fetch /api/province/audit but falls back to a simulated list.
 * It shows a search box, filter controls, a "simulate new action" button and a timeline-style list.
 */

const COLORS = {
  licorice: "#1E0D0A",
  rosewood: "#550006",
  mahogany: "#BF353B",
  froly: "#EE666A",
  deepMoss: "#3D4421",
};

const sampleLogs = [
  {
    id: "A-9001",
    timestamp: "2025-09-22T14:12:00Z",
    user: "Cmdr. Ndlovu",
    action: "Approved transfer",
    target: "R-1002",
    tokenId: "TKN-5002",
    note: "Approved after verifying license & paperwork. Marked for delivery.",
  },
  {
    id: "A-9002",
    timestamp: "2025-09-18T09:05:00Z",
    user: "Lt. Moyo",
    action: "Viewed details",
    target: "R-1001",
    tokenId: "TKN-5001",
    note: "Checked serial and dealer invoice. Requested receiver signature.",
  },
  {
    id: "A-9003",
    timestamp: "2025-09-10T11:43:00Z",
    user: "Audit Officer",
    action: "Requested info",
    target: "R-1003",
    tokenId: "TKN-5003",
    note: "Transport permit and insurance documentation required for community demo.",
  },
  {
    id: "A-9004",
    timestamp: "2025-07-12T07:30:00Z",
    user: "Inspector K.",
    action: "Declined (budget)",
    target: "R-1004",
    tokenId: null,
    note: "Exceeded quarter budget — instruct to resubmit with phased costing.",
  },
];

function actionColor(action) {
  const lower = (action || "").toLowerCase();
  if (lower.includes("approve")) return COLORS.deepMoss; // greenish
  if (lower.includes("declin") || lower.includes("reject")) return COLORS.mahogany; // red
  if (lower.includes("info") || lower.includes("request")) return COLORS.rosewood; // rosewood
  if (lower.includes("view")) return COLORS.froly; // froly (accent)
  return COLORS.licorice;
}

function actionIcon(action, className = "h-5 w-5 text-white") {
  const lower = (action || "").toLowerCase();
  if (lower.includes("approve")) return <CheckCircleIcon className={className} />;
  if (lower.includes("declin") || lower.includes("reject")) return <XCircleIcon className={className} />;
  if (lower.includes("info") || lower.includes("request")) return <InformationCircleIcon className={className} />;
  if (lower.includes("view")) return <EyeIcon className={className} />;
  return <UserCircleIcon className={className} />;
}

export default function Audit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    axios
      .get("/api/province/audit")
      .then((res) => {
        if (!mounted) return;
        const data = Array.isArray(res.data) && res.data.length ? res.data : sampleLogs;
        // normalize: ensure timestamp is ISO
        setLogs(
          data
            .map((d) => ({
              id: d.id || `A-${Math.random().toString(36).slice(2, 9)}`,
              timestamp: d.timestamp || new Date().toISOString(),
              user: d.user || d.actor || "Unknown",
              action: d.action || "Action",
              target: d.target || d.reportId || null,
              tokenId: d.tokenId || d.token || null,
              note: d.details || d.note || d.comment || "",
            }))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        );
      })
      .catch(() => {
        // fallback to sample logs
        setLogs(sampleLogs);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // simple search + filter
  const shown = logs.filter((l) => {
    if (filter !== "all") {
      const lower = filter.toLowerCase();
      if (lower === "approved" && !l.action.toLowerCase().includes("approve")) return false;
      if (lower === "pending" && l.action.toLowerCase().includes("approve")) return false; // simplistic
      if (lower === "info" && !l.action.toLowerCase().includes("info")) return false;
      if (lower === "declined" && !(l.action.toLowerCase().includes("declin") || l.action.toLowerCase().includes("reject"))) return false;
    }
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      (l.user || "").toLowerCase().includes(s) ||
      (l.action || "").toLowerCase().includes(s) ||
      (l.target || "").toLowerCase().includes(s) ||
      (l.tokenId || "").toLowerCase().includes(s) ||
      (l.note || "").toLowerCase().includes(s)
    );
  });

  function simulateNewAction() {
    const now = new Date();
    const newEntry = {
      id: `A-${Math.floor(Math.random() * 9999)}`,
      timestamp: now.toISOString(),
      user: "Sim. Auditor",
      action: Math.random() > 0.6 ? "Approved transfer" : Math.random() > 0.5 ? "Requested info" : "Viewed details",
      target: Math.random() > 0.5 ? "R-1001" : "R-1005",
      tokenId: Math.random() > 0.5 ? "TKN-5001" : `TKN-${5000 + Math.floor(Math.random() * 10)}`,
      note: "Simulated audit action for preview.",
    };
    setLogs((p) => [newEntry, ...p]);
  }

  return (
    <div className="p-8 min-h-screen" style={{ background: `linear-gradient(180deg,#f8fafc, #ffffff)` }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-6 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Audit — Decision History</h1>
          <p className="mt-1 text-sm text-gray-600 max-w-xl">
            Timeline of actions (approvals, declines, views, info requests). Each entry links to the report and shows token
            details where available.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border rounded-lg shadow-sm px-3 py-1.5">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 mr-2" />
            <input
              placeholder="Search user, action, token, report..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="outline-none text-sm placeholder-gray-400"
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border px-3 py-2 bg-white text-sm shadow-sm"
          >
            <option value="all">All</option>
            <option value="approved">Approved</option>
            <option value="info">Info Requests</option>
            <option value="declined">Declined</option>
            <option value="pending">Pending / Viewed</option>
          </select>

          <button
            onClick={() => {
              simulateNewAction();
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white shadow-sm text-sm font-medium hover:shadow-md"
            title="Simulate new audit entry"
          >
            <ArrowPathIcon className="h-4 w-4 text-gray-600" />
            Simulate
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading audit history...</div>
      ) : shown.length === 0 ? (
        <div className="text-gray-500">No audit entries match this filter.</div>
      ) : (
        <div className="space-y-6">
          {/* timeline wrapper */}
          <div className="relative pl-8">
            {/* vertical line */}
            <div
              className="absolute left-3 top-0 bottom-0 w-0.5"
              style={{ background: `linear-gradient(${COLORS.froly}, ${COLORS.deepMoss})`, opacity: 0.18 }}
            />
            {shown.map((l, ) => {
              const color = actionColor(l.action);
              const time = new Date(l.timestamp);
              const when = time.toLocaleString();
              const isExpanded = expandedId === l.id;
              return (
                <div key={l.id} className="relative">
                  {/* bullet */}
                  <div
                    className="absolute -left-[26px] top-1.5 flex items-center justify-center rounded-full"
                    style={{
                      width: 44,
                      height: 44,
                      background: `linear-gradient(135deg, ${COLORS.licorice}, ${COLORS.deepMoss})`,
                      boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
                    }}
                    aria-hidden
                  >
                    <div
                      className="rounded-full p-2 flex items-center justify-center"
                      style={{ background: color, width: 34, height: 34 }}
                    >
                      {actionIcon(l.action, "h-5 w-5 text-white")}
                    </div>
                  </div>

                  <div
                    className="pl-6 pr-4 py-4 bg-white rounded-xl border shadow-sm hover:shadow-md transition relative"
                    style={{ borderLeft: `4px solid ${color}` }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-semibold text-gray-900">{l.user}</div>
                          <div className="text-xs text-gray-400">{when}</div>
                          {l.tokenId && (
                            <div className="ml-2 text-xs font-mono text-gray-600 bg-gray-50 px-2 py-0.5 rounded">
                              {l.tokenId}
                            </div>
                          )}
                          {l.target && (
                            <div className="ml-2 text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                              Report: {l.target}
                            </div>
                          )}
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                          <div className="text-sm text-gray-700 font-medium">{l.action}</div>
                          <div className="text-sm text-gray-500">{l.note && "— " + (l.note.length > 140 ? l.note.slice(0, 140) + "…" : l.note)}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : l.id)}
                          className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white border text-sm shadow-sm hover:shadow-md"
                        >
                          <ClockIcon className="h-4 w-4 text-gray-600" />
                          {isExpanded ? "Hide" : "Details"}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 border-t pt-4 text-sm text-gray-700 space-y-3">
                        <div>
                          <strong>Action:</strong> {l.action}
                        </div>
                        {l.tokenId && (
                          <div>
                            <strong>Token:</strong>{" "}
                            <span className="font-mono text-sm text-gray-800">{l.tokenId}</span>
                          </div>
                        )}
                        {l.target && (
                          <div>
                            <strong>Report:</strong> {l.target}
                          </div>
                        )}
                        {l.note && (
                          <div>
                            <strong>Notes:</strong> {l.note}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
