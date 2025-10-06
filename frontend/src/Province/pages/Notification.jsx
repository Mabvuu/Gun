// src/Province/pages/Notification.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  UserIcon,
  ClockIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";

/**
 * Pretty Notifications simulation (>= 24 items)
 * - Uses the color palette:
 *    licorice:  #1E0D0A
 *    rosewood:  #550006
 *    mahogany:  #BF353B
 *    froly:     #EE666A
 *    deepMoss:  #3D4421
 *
 * - Simulates 24 notifications on mount.
 * - Allows acknowledge (removes), acknowledge all, view details modal, and simple filtering/search.
 * - This file removes the unused index from the map to satisfy ESLint.
 */

const COLORS = {
  licorice: "#1E0D0A",
  rosewood: "#550006",
  mahogany: "#BF353B",
  froly: "#EE666A",
  deepMoss: "#3D4421",
};

const TYPES = {
  ALERT: "alert",
  INFO: "info",
  TOKEN: "token",
  ACTION: "action",
  AUDIT: "audit",
};

function iconForType(type) {
  switch (type) {
    case TYPES.ALERT:
      return <ExclamationTriangleIcon className="h-6 w-6 text-white" />;
    case TYPES.TOKEN:
      return <DocumentTextIcon className="h-6 w-6 text-white" />;
    case TYPES.ACTION:
      return <CheckCircleIcon className="h-6 w-6 text-white" />;
    case TYPES.AUDIT:
      return <UserIcon className="h-6 w-6 text-white" />;
    default:
      return <InformationCircleIcon className="h-6 w-6 text-white" />;
  }
}

function makeSimulatedNotifications(count = 24) {
  const samples = [
    {
      title: "Token Approved",
      type: TYPES.TOKEN,
      severity: "high",
      message: "Token TKN-5002 was approved by Cmdr. Ndlovu — rifle cleared for delivery.",
    },
    {
      title: "Missing Receiver Signature",
      type: TYPES.ALERT,
      severity: "high",
      message: "Report R-1005 missing receiver signature for token TKN-5001.",
    },
    {
      title: "Transport Permit Required",
      type: TYPES.INFO,
      severity: "medium",
      message: "Transport permit required for demo firearm (TKN-5003).",
    },
    {
      title: "Audit Note",
      type: TYPES.AUDIT,
      severity: "low",
      message: "Audit officer requested additional paperwork for armoury inventory.",
    },
    {
      title: "Rejected — Budget",
      type: TYPES.ACTION,
      severity: "high",
      message: "R-1004 rejected due to budget constraints.",
    },
    {
      title: "Dealer Invoice Received",
      type: TYPES.TOKEN,
      severity: "medium",
      message: "Invoice from Apex Armaments received for TKN-5001.",
    },
  ];

  const now = Date.now();
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const s = samples[i % samples.length];
    const minutesAgo = i * 7 + (i % 3) * 2;
    const ts = new Date(now - minutesAgo * 60 * 1000).toISOString();

    const token = Math.random() > 0.25 ? `TKN-${5000 + ((i * 13) % 50)}` : null;
    const report = Math.random() > 0.3 ? `R-10${(1 + (i % 9)).toString().padStart(2, "0")}` : null;

    out.push({
      id: `N-${1000 + i}`,
      title: s.title,
      message: s.message,
      type: s.type,
      severity: s.severity,
      timestamp: ts,
      tokenId: token,
      reportId: report,
      read: false,
      meta: {
        dealer:
          Math.random() > 0.6
            ? "Apex Armaments Ltd"
            : Math.random() > 0.5
            ? "Frontline Supplies"
            : "Metro Defence",
        officer: Math.random() > 0.5 ? "Officer T. Dube" : "Cmdr. Ndlovu",
      },
    });
  }
  return out.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export default function Notifications() {
  const [notes, setNotes] = useState([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState(null);

  useEffect(() => {
    const simulated = makeSimulatedNotifications(24);
    setNotes(simulated);

    const interval = setInterval(() => {
      setNotes((prev) => {
        const extras = makeSimulatedNotifications(1);
        const next = [extras[0], ...prev];
        return next.slice(0, 60);
      });
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = useMemo(() => notes.filter((n) => !n.read).length, [notes]);

  function acknowledge(id) {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setTimeout(() => {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (modal && modal.id === id) setModal(null);
    }, 240);
  }

  function acknowledgeAll() {
    setNotes([]);
    setModal(null);
  }

  const shown = notes.filter((n) => {
    if (filter !== "all" && n.type !== filter) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      (n.title || "").toLowerCase().includes(s) ||
      (n.message || "").toLowerCase().includes(s) ||
      (n.tokenId || "").toLowerCase().includes(s) ||
      (n.reportId || "").toLowerCase().includes(s) ||
      (n.meta?.dealer || "").toLowerCase().includes(s)
    );
  });

  function colorForSeverity(sev) {
    if (sev === "high") return COLORS.mahogany;
    if (sev === "medium") return COLORS.rosewood;
    return COLORS.froly;
  }

  return (
    <div className="p-8 min-h-screen" style={{ background: `linear-gradient(180deg, #f8fafc, #ffffff)` }}>
      <div className="max-w-5xl mx-auto">
        {/* header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold" style={{ color: COLORS.licorice }}>
              High Priority Notifications
            </h1>
            <p className="text-sm text-gray-600 mt-1">Simulated list — token & audit related events. Showing latest activities first.</p>
            <div className="mt-3 inline-flex items-center gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border" style={{ borderColor: COLORS.deepMoss }}>
                <ClockIcon className="h-4 w-4 text-gray-600" />
                <span className="text-sm text-gray-700">{new Date().toLocaleString()}</span>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: `linear-gradient(90deg, ${COLORS.froly}, ${COLORS.rosewood})`, color: "white" }}>
                Unread: <span className="font-medium ml-2">{unreadCount}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white border rounded-lg shadow-sm px-3 py-1.5">
              <input
                placeholder="Search token, report, message, dealer..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="outline-none text-sm placeholder-gray-400"
              />
            </div>

            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border px-3 py-2 bg-white text-sm shadow-sm">
              <option value="all">All types</option>
              <option value={TYPES.ALERT}>Alerts</option>
              <option value={TYPES.TOKEN}>Token</option>
              <option value={TYPES.INFO}>Info</option>
              <option value={TYPES.ACTION}>Action</option>
              <option value={TYPES.AUDIT}>Audit</option>
            </select>

            <button
              onClick={acknowledgeAll}
              className="px-3 py-2 rounded-md bg-white border shadow-sm text-sm hover:shadow-md"
              title="Acknowledge all (clear list)"
            >
              Acknowledge all
            </button>
          </div>
        </div>

        {/* grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shown.map((n) => {
            const bgAccent =
              n.type === TYPES.ALERT
                ? `linear-gradient(135deg, ${COLORS.mahogany}, ${COLORS.rosewood})`
                : n.type === TYPES.TOKEN
                ? `linear-gradient(135deg, ${COLORS.deepMoss}, ${COLORS.froly})`
                : `linear-gradient(135deg, ${COLORS.froly}, ${COLORS.rosewood})`;

            return (
              <div
                key={n.id}
                className={`p-4 rounded-xl shadow-md border transform transition hover:-translate-y-0.5 ${n.read ? "opacity-60" : ""}`}
                style={{ borderColor: colorForSeverity(n.severity) }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="rounded-lg flex-shrink-0 p-3 flex items-center justify-center"
                    style={{ width: 56, height: 56, background: bgAccent }}
                    aria-hidden
                  >
                    {iconForType(n.type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold" style={{ color: COLORS.licorice }}>
                          {n.title}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{n.message}</div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-gray-400">{new Date(n.timestamp).toLocaleString()}</div>
                        <div className="mt-2 text-xs text-gray-500">
                          {n.tokenId && <span className="font-mono px-2 py-0.5 rounded bg-gray-50 inline-block">{n.tokenId}</span>}
                          {n.reportId && <div className="mt-1 text-indigo-600 text-xs">Report: {n.reportId}</div>}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => setModal(n)}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white border text-sm shadow-sm hover:shadow-md"
                      >
                        View
                      </button>

                      <button
                        onClick={() => acknowledge(n.id)}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[rgba(0,0,0,0.06)] text-sm hover:bg-[rgba(0,0,0,0.08)]"
                      >
                        Acknowledge
                      </button>

                      <div className="ml-auto text-xs text-gray-400 px-2 py-0.5 rounded" style={{ border: `1px solid ${colorForSeverity(n.severity)}` }}>
                        {n.severity.toUpperCase()}
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-gray-500">
                      Dealer: {n.meta?.dealer || "—"} • Officer: {n.meta?.officer || "—"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* empty state */}
        {shown.length === 0 && (
          <div className="mt-8 text-center text-gray-500">
            No notifications match your filters.
          </div>
        )}
      </div>

      {/* Modal for detail view */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setModal(null)} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-xl w-full mx-auto z-10 overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold" style={{ color: COLORS.licorice }}>{modal.title}</div>
                <div className="text-xs text-gray-500">{modal.id} • {new Date(modal.timestamp).toLocaleString()}</div>
              </div>
              <button onClick={() => setModal(null)} className="p-2 rounded hover:bg-gray-100">
                <XMarkIcon className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-sm text-gray-700">{modal.message}</div>

              {modal.tokenId && (
                <div className="text-sm">
                  <strong>Token</strong>: <span className="font-mono">{modal.tokenId}</span>
                </div>
              )}

              {modal.reportId && (
                <div className="text-sm">
                  <strong>Report</strong>: {modal.reportId}
                </div>
              )}

              <div className="text-sm text-gray-600">
                <strong>Dealer</strong>: {modal.meta?.dealer || "—"} <br />
                <strong>Officer</strong>: {modal.meta?.officer || "—"}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    acknowledge(modal.id);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-green-600 text-white shadow hover:bg-green-700"
                >
                  Acknowledge
                </button>

                <button
                  onClick={() => setModal(null)}
                  className="px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="p-3 border-t text-xs text-gray-500">
              This is a simulated notification preview using the project color palette.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

