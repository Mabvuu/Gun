// src/Dealer/Pages/Transfers.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

/**
 * Transfers.jsx
 * - Simulation-first Transfers list (always visible if API empty)
 * - Horizontal "file" rows on wide screens, stacked on small screens
 * - NO horizontal page scroll (only vertical)
 * - Respects a left fixed nav if you set --dealer-nav-width on :root (optional)
 * - Approvals only come from "CFR" and all simulated transfers originate from the dealer email
 *
 * Drop this file in place of your current Transfers.jsx
 */

const PALETTE = {
  deepBlue: "#025067",
  teal: "#0B9FBD",
  plum: "#6C0E42",
  magenta: "#B31B6F",
  bgDark: "#071719",
  card: "#0e1e23",
  subtle: "rgba(255,255,255,0.06)",
  text: "#E6EEF2",
  muted: "rgba(255,255,255,0.6)",
  danger: "#E34A4A",
  ok: "#1BA55B",
  warn: "#E6B800",
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function sampleSerial() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 12 })
    .map(() => chars[randInt(0, chars.length - 1)])
    .join("");
}
function sampleTxHash() {
  return "0x" + Array.from({ length: 20 }).map(() => Math.floor(Math.random() * 16).toString(16)).join("");
}
function makeTransfer(i = 0, dealerEmail = "dealer@dealer.test") {
  const statusRoll = Math.random();
  const status = statusRoll > 0.9 ? "Failed" : statusRoll > 0.25 ? "Complete" : "Processing";
  const now = Date.now() - randInt(0, 1000 * 60 * 60 * 24 * 30);
  return {
    id: `tx_${Date.now().toString(36)}_${i}_${randInt(10, 99)}`,
    tokenId: String(randInt(100000, 999999)),
    serial: sampleSerial(),
    from: dealerEmail,
    to: `${["recipient", "user", "client"][randInt(0,2)]}${randInt(10,99)}@example.com`,
    status,
    approver: "CFR", // approvals only come from CFR
    txHash: sampleTxHash(),
    transferredAt: now,
    note: status === "Failed" ? "On-chain re-org" : "Approved by CFR",
  };
}
function statusColorHex(s) {
  const st = (s || "").toLowerCase();
  if (st.includes("complete")) return PALETTE.ok;
  if (st.includes("failed")) return PALETTE.danger;
  return PALETTE.warn;
}

export default function Transfers() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState(new Set());
  const [usingSimulation, setUsingSimulation] = useState(false);

  // Controls
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("All"); // All / Complete / Processing / Failed
  const [sortBy, setSortBy] = useState("date_desc");
  const [perPage, setPerPage] = useState(12);
  const [page, setPage] = useState(1);

  // Dealer email: read from local/session storage if present, else fallback
  const dealerEmail =
    (typeof window !== "undefined" && (localStorage.getItem("dealerEmail") || localStorage.getItem("email") || sessionStorage.getItem("email"))) ||
    "dealer@dealer.test";

  // load transfers with robust fallback to simulation
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await axios.get("/api/dealer/transfers").catch(() => ({ data: null }));
        if (!mounted) return;

        if (Array.isArray(res.data) && res.data.length > 0) {
          // normalize API data
          const data = res.data.map((t, i) => ({
            id: t.id ?? t._id ?? t.transferId ?? `api_${i}`,
            tokenId: t.tokenId?.toString() ?? String(t.token?.id ?? randInt(100000, 999999)),
            serial: t.gunSerial ?? t.serial ?? sampleSerial(),
            from: t.from ?? t.fromAddress ?? dealerEmail,
            to: t.to ?? t.destination ?? `recipient${i}@example.com`,
            status: t.status ?? "Complete",
            approver: t.approver ?? "CFR",
            txHash: t.txHash ?? t.transactionHash ?? sampleTxHash(),
            transferredAt: t.transferredAt ? new Date(t.transferredAt).getTime() : Date.now(),
            note: t.note ?? (t.status?.toLowerCase?.().includes("fail") ? "API error" : "Approved by CFR"),
          }));
          setTransfers(data);
          setUsingSimulation(false);
        } else {
          // simulate
          const sims = Array.from({ length: 18 }).map((_, i) => makeTransfer(i, dealerEmail));
          setTransfers(sims);
          setUsingSimulation(true);
        }
      } catch (err) {
        // fallback to simulation
        console.error("load transfers error, falling back to simulation", err);
        const sims = Array.from({ length: 18 }).map((_, i) => makeTransfer(i, dealerEmail));
        setTransfers(sims);
        setUsingSimulation(true);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [dealerEmail]);

  // derived filtered + sorted
  const filtered = useMemo(() => {
    let list = transfers.slice();
    if (q?.trim()) {
      const qq = q.trim().toLowerCase();
      list = list.filter(
        (t) =>
          String(t.tokenId).toLowerCase().includes(qq) ||
          (t.serial || "").toLowerCase().includes(qq) ||
          (t.to || "").toLowerCase().includes(qq) ||
          (t.txHash || "").toLowerCase().includes(qq)
      );
    }
    if (statusFilter !== "All") {
      list = list.filter((t) => t.status === statusFilter);
    }
    if (sortBy === "date_desc") list.sort((a, b) => b.transferredAt - a.transferredAt);
    if (sortBy === "date_asc") list.sort((a, b) => a.transferredAt - b.transferredAt);
    if (sortBy === "tokenid") list.sort((a, b) => (a.tokenId || "").localeCompare(b.tokenId || ""));
    return list;
  }, [transfers, q, statusFilter, sortBy]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const pageSafe = Math.min(Math.max(1, page), pages);
  const shown = filtered.slice((pageSafe - 1) * perPage, pageSafe * perPage);

  // UI actions (simulation-friendly). Approvals only from CFR — reflect that in note/status.
  async function handleAction(id, action) {
    setBusyIds((prev) => new Set(prev).add(id));
    try {
      await axios.post(`/api/dealer/transfers/${encodeURIComponent(id)}/${action}`).catch(() => null);
      setTransfers((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          if (action === "resend") {
            return { ...t, note: "Resent by dealer (sim)", transferredAt: Date.now() };
          }
          if (action === "mark-complete") {
            return { ...t, status: "Complete", approver: "CFR", note: "Approved by CFR (manually marked)", transferredAt: Date.now() };
          }
          if (action === "remove") {
            return null;
          }
          return t;
        }).filter(Boolean)
      );
    } catch (err) {
      console.error("action error", err);
      alert("Action failed (simulation). See console.");
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  function copyToClipboard(text) {
    if (!navigator?.clipboard) {
      alert("Clipboard unsupported");
      return;
    }
    navigator.clipboard.writeText(text).catch(() => {});
  }

  function regenerateSimulation() {
    setTransfers(Array.from({ length: 18 }).map((_, i) => makeTransfer(i, dealerEmail)));
    setUsingSimulation(true);
    setPage(1);
  }

  if (loading) {
    return (
      <div style={{ padding: 24, minHeight: "60vh", background: PALETTE.bgDark, overflowX: "hidden" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", color: PALETTE.text }}>Loading transfers…</div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 24,
        minHeight: "100vh",
        background: PALETTE.bgDark,
        color: PALETTE.text,
        fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto',
        overflowX: "hidden", // prevent horizontal scroll
        // respect left fixed nav if provided: set --dealer-nav-width on root (optional)
        marginLeft: "calc(var(--dealer-nav-width, 0px))",
      }}
    >
      {/* component-scoped styles (responsive, prevents horizontal overflow) */}
      <style>{`
        .transfers-wrap { max-width: 1100px; margin: 0 auto; }
        .transfers-header { display:flex; gap:12px; align-items:center; justify-content:space-between; margin-bottom:12px; flex-wrap:wrap; }
        .controls { display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
        .search-box { background: rgba(255,255,255,0.02); padding:8px; border-radius:8px; display:flex; gap:8px; align-items:center; }
        .grid-header, .grid-row { display: grid; gap: 12px; align-items: center;
          grid-template-columns: 110px minmax(160px, 1fr) minmax(220px,1fr) 140px 160px 200px;
        }
        .grid-header { padding:10px 12px; border-radius:10px; background: linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); color: ${PALETTE.muted}; font-size:13px; border:1px solid ${PALETTE.subtle}; margin-bottom:6px; }
        .grid-row { padding:12px; border-radius:10px; background: ${PALETTE.card}; border:1px solid ${PALETTE.subtle}; box-shadow: 0 6px 14px rgba(2,6,23,0.28); }
        .truncate { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .actions { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        /* small screens: stack rows vertically to avoid horizontal scrolling */
        @media (max-width: 980px) {
          .grid-header, .grid-row { grid-template-columns: 1fr; }
          .grid-header > div, .grid-row > div { width: 100%; }
        }
      `}</style>

      <div className="transfers-wrap">
        <div className="transfers-header">
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Transfers</h1>
            <div style={{ color: PALETTE.muted, fontSize: 13 }}>
              Successfully transferred tokens — approvals are issued by <strong style={{ color: PALETTE.text }}>CFR</strong>. All transfers originate from <strong style={{ color: PALETTE.text }}>{dealerEmail}</strong>.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div className="search-box">
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Search token, serial, to, tx"
                style={{ background: "transparent", color: PALETTE.text, border: "none", outline: "none", width: 260 }}
              />
              <button
                onClick={() => {
                  setQ("");
                  setStatusFilter("All");
                  setSortBy("date_desc");
                }}
                title="Reset filters"
                style={{ padding: "8px 10px", borderRadius: 8, background: "transparent", border: `1px solid ${PALETTE.subtle}`, color: PALETTE.muted, cursor: "pointer" }}
              >
                Reset
              </button>
              <button
                onClick={regenerateSimulation}
                title="Regenerate simulation"
                style={{ padding: "8px 10px", borderRadius: 8, background: PALETTE.teal, color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 }}
              >
                Regenerate
              </button>
            </div>
          </div>
        </div>

        {usingSimulation && (
          <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, background: "linear-gradient(90deg, rgba(11,159,189,0.12), rgba(108,14,66,0.08))", color: PALETTE.text }}>
            SIMULATION MODE — using generated transfers (approvals from CFR, transfers from dealer).
          </div>
        )}

        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ fontSize: 13, color: PALETTE.muted }}>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{ padding: "8px 10px", borderRadius: 8, background: PALETTE.card, color: PALETTE.text, border: `1px solid ${PALETTE.subtle}` }}
            >
              <option>All</option>
              <option>Complete</option>
              <option>Processing</option>
              <option>Failed</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ fontSize: 13, color: PALETTE.muted }}>Sort</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, background: PALETTE.card, color: PALETTE.text, border: `1px solid ${PALETTE.subtle}` }}>
              <option value="date_desc">Date (new → old)</option>
              <option value="date_asc">Date (old → new)</option>
              <option value="tokenid">Token ID (A → Z)</option>
            </select>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ color: PALETTE.muted, fontSize: 13 }}>{total} results</div>
            <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} style={{ padding: "8px 10px", borderRadius: 8, background: PALETTE.card, color: PALETTE.text, border: `1px solid ${PALETTE.subtle}` }}>
              <option value={6}>6 / page</option>
              <option value={12}>12 / page</option>
              <option value={24}>24 / page</option>
            </select>
          </div>
        </div>

        {/* Header row */}
        <div className="grid-header" role="row">
          <div>Token</div>
          <div>Serial</div>
          <div>From → To</div>
          <div>Status / Approver</div>
          <div>Transferred</div>
          <div>TX / Actions</div>
        </div>

        {/* Rows */}
        <div style={{ display: "grid", gap: 12 }}>
          {shown.map((t) => {
            const busy = busyIds.has(t.id);
            return (
              <div key={t.id} className="grid-row" role="row">
                <div>
                  <div style={{ fontWeight: 800, color: PALETTE.text }}>{t.tokenId}</div>
                  <div style={{ fontSize: 12, color: PALETTE.muted, marginTop: 6 }}>Token ID</div>
                </div>

                <div style={{ minWidth: 0 }}>
                  <div className="truncate" style={{ fontWeight: 700, color: PALETTE.text }}>{t.serial}</div>
                  <div style={{ fontSize: 12, color: PALETTE.muted, marginTop: 6 }}>Serial</div>
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span className="truncate" style={{ maxWidth: 240, color: PALETTE.muted }}>{t.from}</span>
                    <span style={{ color: PALETTE.text, fontWeight: 700 }}>→</span>
                    <span className="truncate" style={{ maxWidth: 240, color: PALETTE.text }}>{t.to}</span>
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ width: 10, height: 10, borderRadius: 9999, background: statusColorHex(t.status), display: "inline-block" }} />
                    <div style={{ fontWeight: 800, color: PALETTE.text }}>{t.status}</div>
                  </div>
                  <div style={{ fontSize: 12, color: PALETTE.muted, marginTop: 6 }}>
                    Approver: <strong style={{ color: PALETTE.text }}>{t.approver ?? "CFR"}</strong>
                  </div>
                </div>

                <div>
                  <div style={{ color: PALETTE.text, fontWeight: 700 }}>{new Date(t.transferredAt).toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: PALETTE.muted, marginTop: 6 }}>Local time</div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="truncate" style={{ fontSize: 13, color: PALETTE.muted }}>{t.txHash}</div>

                    <div className="actions" style={{ marginTop: 6 }}>
                      <button onClick={() => copyToClipboard(t.txHash)} style={{ padding: "8px 10px", borderRadius: 8, background: "transparent", color: PALETTE.muted, border: `1px solid ${PALETTE.subtle}`, cursor: "pointer" }} title="Copy TX hash">Copy</button>

                      <button onClick={() => handleAction(t.id, "resend")} disabled={busy} style={{ padding: "8px 10px", borderRadius: 8, background: busy ? "rgba(255,255,255,0.02)" : PALETTE.deepBlue, color: "#fff", border: "none", cursor: busy ? "default" : "pointer", fontWeight: 700 }}>{busy ? "Working…" : "Resend"}</button>

                      <button onClick={() => handleAction(t.id, "mark-complete")} disabled={busy || t.status === "Complete"} style={{ padding: "8px 10px", borderRadius: 8, background: t.status === "Complete" ? "rgba(255,255,255,0.02)" : PALETTE.teal, color: "#fff", border: "none", cursor: busy ? "default" : "pointer", fontWeight: 700 }}>
                        {t.status === "Complete" ? "Completed" : "Mark Complete (CFR)"}
                      </button>

                      <button onClick={() => handleAction(t.id, "remove")} disabled={busy} style={{ padding: "8px 10px", borderRadius: 8, background: "transparent", color: PALETTE.danger, border: `1px solid ${PALETTE.subtle}`, cursor: busy ? "default" : "pointer", fontWeight: 700 }}>Remove</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, gap: 8, flexWrap: "wrap" }}>
          <div style={{ color: PALETTE.muted }}>{`Showing ${Math.min(total, (pageSafe - 1) * perPage + 1)}–${Math.min(total, pageSafe * perPage)} of ${total}`}</div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => setPage(1)} disabled={pageSafe === 1} style={{ padding: "8px 10px", borderRadius: 8, background: pageSafe === 1 ? "rgba(255,255,255,0.02)" : PALETTE.card, color: PALETTE.text, border: `1px solid ${PALETTE.subtle}`, cursor: pageSafe === 1 ? "default" : "pointer" }}>« First</button>

            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pageSafe === 1} style={{ padding: "8px 10px", borderRadius: 8, background: pageSafe === 1 ? "rgba(255,255,255,0.02)" : PALETTE.card, color: PALETTE.text, border: `1px solid ${PALETTE.subtle}`, cursor: pageSafe === 1 ? "default" : "pointer" }}>‹ Prev</button>

            <div style={{ display: "flex", alignItems: "center", gap: 8, color: PALETTE.muted }}>
              Page
              <input value={pageSafe} onChange={(e) => { const v = Number(e.target.value || 1); if (!Number.isNaN(v)) setPage(Math.min(Math.max(1, v), pages)); }} style={{ width: 56, padding: "6px 8px", borderRadius: 8, background: PALETTE.card, color: PALETTE.text, border: `1px solid ${PALETTE.subtle}`, textAlign: "center" }} />
              of {pages}
            </div>

            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={pageSafe === pages} style={{ padding: "8px 10px", borderRadius: 8, background: pageSafe === pages ? "rgba(255,255,255,0.02)" : PALETTE.card, color: PALETTE.text, border: `1px solid ${PALETTE.subtle}`, cursor: pageSafe === pages ? "default" : "pointer" }}>Next ›</button>

            <button onClick={() => setPage(pages)} disabled={pageSafe === pages} style={{ padding: "8px 10px", borderRadius: 8, background: pageSafe === pages ? "rgba(255,255,255,0.02)" : PALETTE.card, color: PALETTE.text, border: `1px solid ${PALETTE.subtle}`, cursor: pageSafe === pages ? "default" : "pointer" }}>Last »</button>
          </div>
        </div>
      </div>
    </div>
  );
}
