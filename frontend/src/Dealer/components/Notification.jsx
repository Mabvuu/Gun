// src/Dealer/components/Notifications.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

/**
 * Notifications.jsx
 * - No JSON copy anywhere
 * - Removed unused variables / ESLint warnings
 * - Uses PALETTE and readable card background so text works on white pages
 * - Cleaner UI (only titles bold, regular body text)
 */

const PALETTE = {
  deepBlue: "#025067",
  teal: "#0B9FBD",
  plum: "#6C0E42",
  magenta: "#B31B6F",
  card: "#0e1e23",
  subtle: "rgba(255,255,255,0.06)",
  text: "#E6EEF2",
  muted: "rgba(255,255,255,0.6)",
  infoBg: "linear-gradient(90deg, rgba(11,159,189,0.06), rgba(11,159,189,0.03))",
  alertBg: "linear-gradient(90deg, rgba(179,27,111,0.06), rgba(179,27,111,0.03))",
  successBg: "linear-gradient(90deg, rgba(27,165,91,0.06), rgba(27,165,91,0.03))",
  subtleBorderLight: "rgba(2,6,23,0.06)",
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function sampleNotification(i = 0) {
  const types = ["info", "alert", "success"];
  const type = types[randInt(0, types.length - 1)];
  const titles = {
    info: ["System update", "Policy change", "Reminder"],
    alert: ["Failed transfer", "Security flag", "MOJ hold"],
    success: ["Transfer complete", "Mint confirmed", "Approved"],
  };
  const messages = {
    info: [
      "Maintenance scheduled at 02:00 UTC. Minimal downtime expected.",
      "Terms updated for dealer accounts — review required.",
      "You have pending transfers that need attention.",
    ],
    alert: [
      "TX failed due to gas limit — please review.",
      "Flagged at MOJ: paperwork mismatch — action required.",
      "Unusual activity detected on account — investigate.",
    ],
    success: [
      "Token transferred successfully — funds settled.",
      "Mint confirmed on-chain — token available in inventory.",
      "CFR approved the batch — ready for sale.",
    ],
  };

  const title = titles[type][randInt(0, titles[type].length - 1)];
  const message = messages[type][randInt(0, messages[type].length - 1)];
  const ts = Date.now() - randInt(0, 1000 * 60 * 60 * 24 * 10);
  return {
    id: `sim_${Date.now().toString(36)}_${i}`,
    title,
    message,
    type,
    unread: Math.random() > 0.45,
    timestamp: ts,
    meta: {
      tx: Math.random() > 0.6 ? `0x${Array.from({ length: 12 }).map(() => Math.floor(Math.random() * 16).toString(16)).join("")}` : null,
      important: type === "alert",
    },
  };
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState(new Set());
  const [error, setError] = useState(null);

  // UI
  const [filter, setFilter] = useState("All"); // All / Unread / info / alert / success
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get("/api/dealer/notifications").catch(() => ({ data: null }));
        if (!mounted) return;
        if (Array.isArray(res.data) && res.data.length > 0) {
          setNotifications(
            res.data.map((n, i) => ({
              id: n.id ?? n._id ?? `n_${i}`,
              title: n.title ?? n.subject ?? "Notification",
              message: n.message ?? n.body ?? "",
              type: (n.type ?? "info").toString().toLowerCase(),
              unread: typeof n.unread === "boolean" ? n.unread : true,
              timestamp: n.timestamp ? new Date(n.timestamp).getTime() : Date.now() - i * 60000,
              meta: n.meta ?? {},
            }))
          );
        } else {
          const sims = Array.from({ length: 9 }).map((_, i) => sampleNotification(i));
          setNotifications(sims);
        }
      } catch (err) {
        console.error("notifications load error", err);
        setError("Could not load notifications — showing demo items");
        const sims = Array.from({ length: 9 }).map((_, i) => sampleNotification(i));
        setNotifications(sims);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const unreadCount = useMemo(() => notifications.filter((n) => n.unread).length, [notifications]);

  const filtered = useMemo(() => {
    if (filter === "All") return notifications;
    if (filter === "Unread") return notifications.filter((n) => n.unread);
    return notifications.filter((n) => n.type.toLowerCase() === filter.toLowerCase());
  }, [notifications, filter]);

  async function markRead(id) {
    if (!id) return;
    setBusyIds((s) => new Set(s).add(id));
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
    try {
      await axios.post(`/api/dealer/notifications/${encodeURIComponent(id)}/read`).catch(() => null);
    } catch (err) {
      console.error("mark read failed", err);
      alert("Could not mark read (simulation)");
    } finally {
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  }

  async function dismiss(id) {
    setBusyIds((s) => new Set(s).add(id));
    const backup = notifications;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await axios.post(`/api/dealer/notifications/${encodeURIComponent(id)}/dismiss`).catch(() => null);
    } catch (err) {
      console.error("dismiss failed", err);
      setNotifications(backup);
      alert("Could not dismiss (simulation)");
    } finally {
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    axios.post("/api/dealer/notifications/read-all").catch(() => null);
  }

  function clearAll() {
    if (!confirm("Clear all notifications?")) return;
    const backup = notifications;
    setNotifications([]);
    axios.post("/api/dealer/notifications/clear-all").catch(() => {
      setNotifications(backup);
      alert("Could not clear (simulation)");
    });
  }

  function prettyTime(ts) {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return "";
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 12, color: PALETTE.muted }}>
        Loading notifications…
      </div>
    );
  }

  if (!notifications.length) {
    return (
      <div style={{ padding: 12, color: PALETTE.muted }}>
        No notifications
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 920,
        color: PALETTE.text,
        fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto',
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{
            display: "inline-grid",
            placeItems: "center",
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "linear-gradient(135deg,#0B9FBD,#6C0E42)",
            color: "#fff",
            fontWeight: 800,
            boxShadow: `0 6px 18px ${PALETTE.subtleBorderLight}`,
            flexShrink: 0
          }}>
            🔔
          </div>

          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: PALETTE.text }}>Notifications</div>
            <div style={{ fontSize: 13, color: PALETTE.muted }}>{unreadCount} unread • {notifications.length} total</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", background: "rgba(255,255,255,0.02)", padding: 6, borderRadius: 10 }}>
            {["All", "Unread", "info", "alert", "success"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 10,
                  background: filter === f ? "rgba(255,255,255,0.04)" : "transparent",
                  color: filter === f ? PALETTE.text : PALETTE.muted,
                  border: `1px solid ${PALETTE.subtle}`,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                {f === "info" ? "Info" : f === "alert" ? "Alerts" : f === "success" ? "Success" : f}
              </button>
            ))}
          </div>

          <button onClick={markAllRead} style={{ padding: "8px 12px", borderRadius: 10, background: PALETTE.deepBlue, color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }}>Mark all read</button>

          <button onClick={clearAll} style={{ padding: "8px 12px", borderRadius: 10, background: "transparent", border: `1px solid ${PALETTE.subtle}`, color: PALETTE.muted, fontWeight: 600, cursor: "pointer" }}>Clear</button>

          <button onClick={() => setCompact(c => !c)} style={{ padding: "8px", borderRadius: 10, background: "transparent", border: `1px solid ${PALETTE.subtle}`, color: PALETTE.muted, fontWeight: 600, cursor: "pointer" }}>{compact ? "Expanded" : "Compact"}</button>
        </div>
      </div>

      {error && <div style={{ padding: 10, borderRadius: 10, background: "rgba(179,27,111,0.06)", color: "#FFB4B4" }}>{error}</div>}

      {/* List */}
      <div style={{ display: "grid", gap: 12 }}>
        {filtered.map(n => {
          const isBusy = busyIds.has(n.id);
          const isAlert = n.type === "alert";
          const isSuccess = n.type === "success";
          const accent = isAlert ? PALETTE.magenta : isSuccess ? PALETTE.deepBlue : PALETTE.teal;
          // small decorative ribbon uses the appropriate gradient (keeps bg var in use)
          const ribbonGradient = isAlert ? PALETTE.alertBg : isSuccess ? PALETTE.successBg : PALETTE.infoBg;

          return (
            <article
              key={n.id}
              aria-live={n.unread ? "polite" : undefined}
              style={{
                display: "flex",
                gap: 12,
                padding: compact ? "10px" : 14,
                borderRadius: 14,
                background: PALETTE.card,
                border: `1px solid ${PALETTE.subtle}`,
                boxShadow: n.meta?.important ? "0 10px 30px rgba(179,27,111,0.08)" : "0 6px 20px rgba(2,6,23,0.06)",
                overflow: "hidden",
                alignItems: "flex-start",
              }}
            >
              {/* decorative vertical ribbon (uses ribbonGradient variable) */}
              <div style={{
                width: 8,
                height: "100%",
                borderRadius: 6,
                background: ribbonGradient,
                flexShrink: 0,
                boxShadow: "inset 0 -6px 14px rgba(0,0,0,0.35)"
              }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ display: "flex", gap: 12, minWidth: 0 }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.02)",
                      display: "grid",
                      placeItems: "center",
                      color: accent,
                      fontWeight: 800,
                      fontSize: 18,
                      flexShrink: 0,
                    }}>
                      {n.title?.charAt(0)?.toUpperCase() ?? "N"}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: PALETTE.text, lineHeight: 1.1 }}>
                        {n.title}
                        {n.unread && <span style={{ marginLeft: 10, padding: "2px 8px", borderRadius: 999, background: accent, color: "#fff", fontSize: 12, fontWeight: 800 }}>NEW</span>}
                        {n.meta?.important && <span style={{ marginLeft: 8, color: accent, fontSize: 13 }}>⚠️</span>}
                      </div>
                      {!compact && <div style={{ marginTop: 8, color: PALETTE.muted, fontSize: 13, lineHeight: 1.4 }}>{n.message}</div>}
                    </div>
                  </div>

                  <div style={{ textAlign: "right", minWidth: 80 }}>
                    <div style={{ fontSize: 12, color: PALETTE.muted }}>{prettyTime(n.timestamp)}</div>
                    {!compact && n.meta?.tx && <div style={{ marginTop: 8 }}>
                      <button
                        onClick={() => {
                          try { navigator.clipboard.writeText(n.meta.tx); alert("TX copied"); } catch { alert("Could not copy"); }
                        }}
                        style={{ padding: "6px 8px", borderRadius: 8, background: "transparent", border: `1px solid ${PALETTE.subtle}`, color: PALETTE.muted, cursor: "pointer", fontWeight: 700, fontSize: 13 }}
                      >
                        Copy TX
                      </button>
                    </div>}
                  </div>
                </div>

                <div style={{ marginTop: compact ? 8 : 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <button
                    onClick={() => markRead(n.id)}
                    disabled={isBusy || !n.unread}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      background: n.unread ? accent : "transparent",
                      color: n.unread ? "#fff" : PALETTE.muted,
                      border: `1px solid ${PALETTE.subtle}`,
                      cursor: isBusy ? "default" : "pointer",
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    {isBusy ? "…" : (n.unread ? "Mark read" : "Read")}
                  </button>

                  <button
                    onClick={() => dismiss(n.id)}
                    disabled={isBusy}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      background: "transparent",
                      color: PALETTE.muted,
                      border: `1px solid ${PALETTE.subtle}`,
                      cursor: isBusy ? "default" : "pointer",
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    Dismiss
                  </button>

                  {n.meta?.important && (
                    <div style={{ marginLeft: "auto", fontSize: 13, color: accent, fontWeight: 700 }}>
                      Important
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
