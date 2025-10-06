// src/PoliceStation/pages/Notifications.jsx
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import axios from "axios";

// generate simulated notifications
function genSimulatedNotifications(count = 100) {
  const titles = [
    "Inspection Passed",
    "Signature Captured",
    "Follow-up Required",
    "Document Verified",
    "Reminder",
    "Assignment",
  ];
  const msgs = [
    "Inspection successful — all checks passed.",
    "Applicant signature captured and stored.",
    "Missing paperwork — follow-up required.",
    "ID and docs verified by inspector.",
    "Reminder: re-inspection scheduled.",
    "New assignment: please review the application.",
  ];
  const users = [
    "Inspector Nyathi",
    "Inspector Moyo",
    "Inspector Dube",
    "Sgt. Chirwa",
    "Const. Banda",
    "Inspector Ndlovu",
  ];
  const out = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const minutesAgo = Math.floor(Math.random() * 60 * 24 * 50);
    const ts = new Date(now - minutesAgo * 60000).toISOString();
    out.push({
      id: `fake-${i}`,
      title: titles[i % titles.length],
      message: msgs[Math.floor(Math.random() * msgs.length)],
      timestamp: ts,
      user: users[i % users.length],
    });
  }
  return out;
}

// convert ISO timestamp to relative time
function niceRelative(iso) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);

  // memoized simulated notifications
  const simulated = useMemo(() => genSimulatedNotifications(100), []);

  // fetch notifications (API or simulated)
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/police/notifications");
      if (res.data && res.data.length > 0) {
        setNotifications(res.data);
      } else {
        setNotifications(simulated);
      }
    } catch {
      setNotifications(simulated);
    } finally {
      setLoading(false);
    }
  }, [simulated]);

  // auto-refresh effect
  useEffect(() => {
    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, 15000);
    return () => clearInterval(intervalRef.current);
  }, [fetchNotifications]);

  // mark a notification as read
  const markRead = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="bg-[#09110D] text-[#E8F8F5] p-6 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-xs text-gray-400 mt-1">
              Live notifications — auto-refresh every 15s
            </p>
          </div>
          <button
            onClick={fetchNotifications}
            disabled={loading}
            className="px-3 py-1.5 rounded-md bg-[#135E3D] text-sm hover:bg-[#1AA06D] disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="bg-[#0B3221] border border-white/10 rounded-md p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 w-full">
                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-[#63DBD5] truncate">{n.title}</h2>
                  <p className="text-xs text-gray-300 mt-0.5 truncate">{n.message}</p>
                </div>
                <span className="text-xs text-gray-400 mt-1 sm:mt-0 shrink-0">{niceRelative(n.timestamp)}</span>
              </div>
              <div className="flex justify-between items-center mt-2 sm:mt-0 gap-4 text-xs text-gray-400 w-full sm:w-auto">
                <span>{n.user}</span>
                <button
                  onClick={() => markRead(n.id)}
                  className="text-[#1AA06D] hover:underline"
                >
                  Mark Read
                </button>
              </div>
            </div>
          ))}
        </div>

        {notifications.length === 0 && (
          <div className="text-center text-gray-500 mt-12 text-sm">
            No notifications
          </div>
        )}
      </div>
    </div>
  );
}
