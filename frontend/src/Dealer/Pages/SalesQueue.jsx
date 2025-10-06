// src/Dealer/Pages/SalesQueue.jsx
import React, { useEffect, useState } from "react";
import ProgressBar from "../components/ProgressBar";
import { Link } from "react-router-dom";

/**
 * Simulation Sales Queue — uses the original palette colors exactly as provided.
 * No unused vars, uses inline styles referencing palette.
 */

const palette = {
  deepBlue: "#025067",
  teal: "#0B9FBD",
  plum: "#6C0E42",
  magenta: "#B31B6F",
  bgDark: "#071719",
  card: "#0e1e23",
  subtle: "rgba(255,255,255,0.06)",
  text: "#E6EEF2",
  muted: "rgba(255,255,255,0.6)",
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function genSerial() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 10 })
    .map(() => chars[randInt(0, chars.length - 1)])
    .join("");
}

function genBuyer() {
  const first = ["Ava", "Noah", "Liam", "Mia", "Ethan", "Zoe", "Lucas", "Sofia", "Mason", "Aria"];
  const last = ["Johnson", "Singh", "Patel", "Brown", "Garcia", "Moyo", "Khan", "Nguyen", "Lee", "Smith"];
  return `${first[randInt(0, first.length - 1)]} ${last[randInt(0, last.length - 1)]}`;
}

function makeSale(i) {
  const progress = randInt(0, 60);
  let status = "Queued";
  if (progress > 50) status = "Under Review";
  return {
    id: `sale_${Date.now().toString(36)}_${i}`,
    serial: genSerial(),
    buyer: genBuyer(),
    progress,
    status,
    createdAt: Date.now() - randInt(0, 1000 * 60 * 60 * 24),
  };
}

function statusColorHex(status) {
  const s = (status || "").toLowerCase();
  if (s.includes("complete") || s.includes("approved")) return "#1BA55B";
  if (s.includes("failed") || s.includes("cancel")) return "#E34A4A";
  return "#E6B800";
}

export default function SalesQueue() {
  const [sales, setSales] = useState(() => {
    const n = 8 + randInt(0, 6);
    return Array.from({ length: n }).map((_, i) => makeSale(i));
  });

  // simulation tick: advance progress & change statuses
  useEffect(() => {
    const interval = setInterval(() => {
      setSales(prev =>
        prev
          .map(s => {
            if (["Complete", "Failed", "Cancelled"].includes(s.status)) return s;

            // progress increment varies by stage
            let inc = randInt(1, 6);
            if (s.status === "Under Review") inc = randInt(0, 4);
            if (s.status === "Processing") inc = randInt(3, 12);

            const newProgress = Math.min(100, s.progress + inc);

            let newStatus = s.status;
            if (s.progress < 10 && newProgress >= 10) newStatus = "Under Review";
            if (newProgress >= 40 && newProgress < 80) newStatus = "Processing";
            if (newProgress >= 80 && newProgress < 100) newStatus = "Approved";

            if (newProgress >= 100) {
              const failChance = 0.08 + Math.random() * 0.07;
              if (Math.random() < failChance) newStatus = "Failed";
              else newStatus = "Complete";
            } else {
              if (Math.random() < 0.002) newStatus = "Failed";
            }

            return { ...s, progress: newProgress, status: newStatus };
          })
          .sort((a, b) => {
            const order = ["Complete", "Approved", "Processing", "Under Review", "Queued", "Failed", "Cancelled"];
            const oa = order.indexOf(a.status) === -1 ? 99 : order.indexOf(a.status);
            const ob = order.indexOf(b.status) === -1 ? 99 : order.indexOf(b.status);
            if (oa !== ob) return ob - oa;
            return b.createdAt - a.createdAt;
          })
      );
    }, 900);

    return () => clearInterval(interval);
  }, []);

  function handleCancel(id) {
    setSales(prev => prev.filter(s => s.id !== id));
  }

  function addRandomSale() {
    setSales(prev => [makeSale(prev.length + 1), ...prev]);
  }

  return (
    <div style={{ padding: 24, background: palette.bgDark, minHeight: "100vh", color: palette.text, fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto' }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Sales Queue</h1>
          <div style={{ color: palette.muted, fontSize: 13, display: "flex", gap: 12, alignItems: "center" }}>
            <button
              onClick={addRandomSale}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                background: palette.deepBlue,
                color: "#fff",
                border: "none",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Add simulated sale
            </button>
            <div style={{ fontSize: 13 }}>{sales.length} queued</div>
          </div>
        </div>

        {sales.length === 0 ? (
          <div style={{ padding: 20, borderRadius: 8, background: palette.card, border: `1px solid ${palette.subtle}`, color: palette.muted }}>
            No queued sales
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {sales.map(s => {
              const id = s.id;
              const serial = s.serial;
              const buyer = s.buyer;
              const progress = Math.max(0, Math.min(100, s.progress));
              const status = s.status || "Queued";
              const statusColor = statusColorHex(status);

              return (
                <div
                  key={id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: 12,
                    borderRadius: 10,
                    background: palette.card,
                    border: `1px solid ${palette.subtle}`,
                    boxShadow: "0 6px 14px rgba(2,6,23,0.28)",
                  }}
                >
                  <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 8,
                        background: "rgba(255,255,255,0.02)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        color: palette.muted,
                        fontSize: 13,
                        flexShrink: 0,
                      }}
                    >
                      {String(serial).slice(0, 6)}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: palette.text, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{serial}</div>
                      <div style={{ color: palette.muted, fontSize: 13 }}>{buyer}</div>
                    </div>
                  </div>

                  <div style={{ flex: 1, margin: "0 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ color: palette.muted, fontSize: 13 }}>Progress</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: statusColor }}>{status}</div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <ProgressBar value={Math.max(0, Math.min(100, progress))} label={`${Math.round(progress)}%`} />
                      </div>

                      <div style={{ width: 64, textAlign: "right", color: palette.muted, fontSize: 13 }}>{Math.round(progress)}%</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Link
                      to={`/dealer/sale/${id}`}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: palette.deepBlue,
                        color: "#fff",
                        textDecoration: "none",
                        fontWeight: 700,
                        fontSize: 13,
                        height: 40,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      View
                    </Link>

                    <button
                      onClick={() => handleCancel(id)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: "transparent",
                        color: palette.muted,
                        border: `1px solid ${palette.subtle}`,
                        fontWeight: 700,
                        cursor: "pointer",
                        height: 40,
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
