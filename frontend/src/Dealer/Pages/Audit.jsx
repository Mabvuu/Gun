// src/Dealer/Pages/Audit.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

/**
 * Audit.jsx — updated details popup
 *
 * - Shows minted / sold / to-be-sold / in-stock / rejected / accepted items
 * - Client-side filtering, search, sorting, pagination
 * - Uses Dealer palette exactly
 * - Simulation fallback (always shows something useful)
 * - No horizontal scroll
 * - Details popup shows clear text fields (including reason for decline / accepted date)
 * - Cute, simple popup styling
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
  accent: "#9EEBCF",
  danger: "#E34A4A",
  ok: "#1BA55B",
  warn: "#E6B800",
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function sampleSerial() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 12 }).map(() => chars[randInt(0, chars.length - 1)]).join("");
}
function sampleTokenId() {
  return String(randInt(100000, 999999));
}
function sampleDate(daysBack = 60) {
  return Date.now() - randInt(0, 1000 * 60 * 60 * 24 * daysBack);
}
function sampleActionType() {
  const types = ["Minted", "Sold", "To be sold", "In stock", "Rejected", "Accepted"];
  return types[randInt(0, types.length - 1)];
}
function makeLog(i = 0, dealerEmail = "dealer@dealer.test") {
  const type = sampleActionType();
  const when = sampleDate();
  const rejected = type === "Rejected";
  const accepted = type === "Accepted";
  return {
    id: `log_${Date.now().toString(36)}_${i}_${randInt(10, 99)}`,
    type,
    tokenId: sampleTokenId(),
    serial: sampleSerial(),
    actor: type === "Minted" ? "Minter" : type === "Sold" ? "Marketplace" : dealerEmail,
    approver: accepted || rejected ? "CFR" : "",
    message:
      type === "Minted"
        ? "Token minted to dealer inventory"
        : type === "Sold"
        ? "Token sold to buyer"
        : type === "To be sold"
        ? "Listed for sale"
        : type === "In stock"
        ? "Available in inventory"
        : type === "Rejected"
        ? "Rejected during audit"
        : "Accepted during audit",
    timestamp: when,
    // extras for details
    acceptedAt: accepted ? when : null,
    rejectedAt: rejected ? when : null,
    reason:
      rejected
        ? // pick a realistic simulated reason
          ["Flagged at MOJ: paperwork mismatch", "Serial tampering suspected", "Documentation incomplete", "Background check failed"][randInt(0, 3)]
        : "",
    note: accepted ? "Accepted by CFR after review" : rejected ? "Removed from inventory" : "",
    raw: { simulated: true, idx: i },
  };
}

function statusColorHex(type) {
  const t = (type || "").toLowerCase();
  if (t.includes("accepted") || t.includes("in stock")) return PALETTE.ok;
  if (t.includes("rejected")) return PALETTE.danger;
  if (t.includes("sold")) return PALETTE.plum;
  if (t.includes("mint")) return PALETTE.teal;
  return PALETTE.warn;
}

export default function Audit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI state
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [sortBy, setSortBy] = useState("date_desc");
  const [perPage, setPerPage] = useState(12);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [usingSimulation, setUsingSimulation] = useState(false);

  const dealerEmail =
    (typeof window !== "undefined" &&
      (localStorage.getItem("dealerEmail") || localStorage.getItem("email") || sessionStorage.getItem("email"))) ||
    "dealer@dealer.test";

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      setUsingSimulation(false);
      try {
        const res = await axios.get("/api/dealer/audit").catch(() => ({ data: null }));
        if (!mounted) return;
        if (Array.isArray(res.data) && res.data.length > 0) {
          const normalized = res.data.map((l, i) => ({
            id: l.id ?? l._id ?? `api_${i}`,
            type: l.type ?? l.action ?? l.category ?? "Log",
            tokenId: l.tokenId?.toString() ?? String(l.token?.id ?? sampleTokenId()),
            serial: l.serial ?? l.gunSerial ?? sampleSerial(),
            actor: l.actor ?? l.user ?? dealerEmail,
            approver: l.approver ?? l.approvedBy ?? "",
            message: l.message ?? l.action ?? JSON.stringify(l).slice(0, 200),
            timestamp: l.timestamp ? new Date(l.timestamp).getTime() : l.createdAt ? new Date(l.createdAt).getTime() : Date.now(),
            acceptedAt: l.acceptedAt ? new Date(l.acceptedAt).getTime() : null,
            rejectedAt: l.rejectedAt ? new Date(l.rejectedAt).getTime() : null,
            reason: l.reason ?? l.rejectReason ?? "",
            note: l.note ?? "",
            raw: l,
          }));
          setLogs(normalized.sort((a, b) => b.timestamp - a.timestamp));
          setUsingSimulation(false);
        } else {
          // simulation fallback
          const sims = Array.from({ length: 24 }).map((_, i) => makeLog(i, dealerEmail));
          setLogs(sims.sort((a, b) => b.timestamp - a.timestamp));
          setUsingSimulation(true);
        }
      } catch (err) {
        console.error("load audit error", err);
        const sims = Array.from({ length: 24 }).map((_, i) => makeLog(i, dealerEmail));
        setLogs(sims.sort((a, b) => b.timestamp - a.timestamp));
        setUsingSimulation(true);
        if (mounted) setError(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [dealerEmail]);

  const filtered = useMemo(() => {
    let list = logs.slice();
    if (query?.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (l) =>
          String(l.type).toLowerCase().includes(q) ||
          String(l.tokenId).toLowerCase().includes(q) ||
          String(l.serial).toLowerCase().includes(q) ||
          String(l.message).toLowerCase().includes(q) ||
          String(l.actor).toLowerCase().includes(q)
      );
    }
    if (filterType !== "All") {
      list = list.filter((l) => l.type === filterType);
    }
    if (sortBy === "date_desc") list.sort((a, b) => b.timestamp - a.timestamp);
    if (sortBy === "date_asc") list.sort((a, b) => a.timestamp - b.timestamp);
    if (sortBy === "token_asc") list.sort((a, b) => String(a.tokenId).localeCompare(String(b.tokenId)));
    return list;
  }, [logs, query, filterType, sortBy]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const pageSafe = Math.min(Math.max(1, page), pages);
  const shown = filtered.slice((pageSafe - 1) * perPage, pageSafe * perPage);

  async function copyToClipboard(obj) {
    try {
      const text = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
      await navigator.clipboard.writeText(text);
      // tiny visual feedback
      alert("Copied to clipboard");
    } catch {
      alert("Could not copy");
    }
  }

  function regenerateSimulation() {
    const sims = Array.from({ length: 24 }).map((_, i) => makeLog(i, dealerEmail));
    setLogs(sims.sort((a, b) => b.timestamp - a.timestamp));
    setUsingSimulation(true);
    setPage(1);
  }

  if (loading) {
    return (
      <div style={{ padding: 24, minHeight: "60vh", background: PALETTE.bgDark, color: PALETTE.text, overflowX: "hidden" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Audit</div>
          <div style={{ padding: 18, borderRadius: 8, background: PALETTE.card, border: `1px solid ${PALETTE.subtle}`, color: PALETTE.muted }}>
            Loading logs…
          </div>
        </div>
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
        overflowX: "hidden",
        marginLeft: "calc(var(--dealer-nav-width, 0px))",
      }}
    >
      <style>{`
        .audit-wrap { max-width: 1100px; margin: 0 auto; }
        .header { display:flex; gap:12px; align-items:center; justify-content:space-between; margin-bottom:12px; flex-wrap:wrap; }
        .controls { display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
        .filter-chips { display:flex; gap:8px; flex-wrap:wrap; }
        .grid-header, .grid-row { display:grid; gap:12px; align-items:center; grid-template-columns: 80px minmax(140px, 1fr) minmax(240px,1fr) 160px 180px 140px; }
        .grid-header { padding:10px 12px; border-radius:10px; background: linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); color: ${PALETTE.muted}; font-size:13px; align-items:center; border:1px solid ${PALETTE.subtle}; margin-bottom:6px; }
        .grid-row { padding:12px; border-radius:10px; background: ${PALETTE.card}; border:1px solid ${PALETTE.subtle}; box-shadow: 0 6px 12px rgba(2,6,23,0.25); }
        .truncate { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .popup { animation: popup 180ms cubic-bezier(.2,.9,.3,1); transform-origin: center; }
        @keyframes popup { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @media (max-width: 980px) {
          .grid-header, .grid-row { grid-template-columns: 1fr; }
          .grid-header > div, .grid-row > div { width: 100%; }
        }
      `}</style>

      <div className="audit-wrap">
        <div className="header">
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Audit</h1>
            <div style={{ color: PALETTE.muted, fontSize: 13, marginTop: 6 }}>
              Activity stream: minted, sold, to-be-sold, in-stock, rejected, accepted.
            </div>
          </div>

          <div className="controls">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                placeholder="Search token, serial, actor, message..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: `1px solid ${PALETTE.subtle}`,
                  background: "transparent",
                  color: PALETTE.text,
                  width: 340,
                }}
              />
              <button
                onClick={() => {
                  setQuery("");
                  setFilterType("All");
                  setSortBy("date_desc");
                }}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: "transparent",
                  color: PALETTE.muted,
                  border: `1px solid ${PALETTE.subtle}`,
                  cursor: "pointer",
                }}
              >
                Reset
              </button>

              <button
                onClick={() => regenerateSimulation()}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: PALETTE.teal,
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
                title="Regenerate simulated logs"
              >
                Regenerate
              </button>
            </div>

            <div className="filter-chips" style={{ marginLeft: 8 }}>
              {["All", "Minted", "Sold", "To be sold", "In stock", "Rejected", "Accepted"].map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setFilterType(t);
                    setPage(1);
                  }}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 999,
                    background: filterType === t ? "linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))" : "transparent",
                    color: filterType === t ? PALETTE.text : PALETTE.muted,
                    border: `1px solid ${PALETTE.subtle}`,
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ padding: "8px 10px", borderRadius: 8, background: PALETTE.card, color: PALETTE.text, border: `1px solid ${PALETTE.subtle}` }}
              >
                <option value="date_desc">Date (new → old)</option>
                <option value="date_asc">Date (old → new)</option>
                <option value="token_asc">Token ID (A → Z)</option>
              </select>

              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                style={{ padding: "8px 10px", borderRadius: 8, background: PALETTE.card, color: PALETTE.text, border: `1px solid ${PALETTE.subtle}` }}
              >
                <option value={6}>6 / page</option>
                <option value={12}>12 / page</option>
                <option value={24}>24 / page</option>
              </select>
            </div>
          </div>
        </div>

        {usingSimulation && (
          <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, background: "linear-gradient(90deg, rgba(11,159,189,0.08), rgba(108,14,66,0.06))", color: PALETTE.text }}>
            SIMULATION MODE — showing generated audit logs.
          </div>
        )}

        {error && (
          <div style={{ marginBottom: 12, padding: 12, borderRadius: 8, background: "rgba(227,74,74,0.06)", color: "#FFB4B4" }}>
            {error}
          </div>
        )}

        <div style={{ display: "grid", gap: 12 }}>
          <div className="grid-header" role="row">
            <div>#</div>
            <div>Token / Serial</div>
            <div>Actor / Message</div>
            <div>Type / Approver</div>
            <div>When</div>
            <div>Actions</div>
          </div>

          {shown.length === 0 ? (
            <div style={{ padding: 18, borderRadius: 10, background: PALETTE.card, border: `1px solid ${PALETTE.subtle}`, color: PALETTE.muted }}>
              No logs found
            </div>
          ) : (
            shown.map((l, idx) => {
              const key = l.id;
              return (
                <div key={key} className="grid-row" role="row">
                  <div style={{ width: 56, height: 56, borderRadius: 8, background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: PALETTE.muted }}>
                    {String((pageSafe - 1) * perPage + idx + 1)}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, color: PALETTE.text }}>{l.tokenId}</div>
                    <div className="truncate" style={{ color: PALETTE.muted, marginTop: 6 }}>{l.serial}</div>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: PALETTE.text }}>{l.actor}</div>
                    <div style={{ color: PALETTE.muted, marginTop: 6, fontSize: 13, maxWidth: 560 }}>{l.message}</div>
                  </div>

                  <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ width: 10, height: 10, borderRadius: 9999, background: statusColorHex(l.type), display: "inline-block" }} />
                      <div style={{ fontWeight: 800, color: PALETTE.text }}>{l.type}</div>
                    </div>
                    <div style={{ marginTop: 6, color: PALETTE.muted }}>Approver: <strong style={{ color: PALETTE.text }}>{l.approver || "—"}</strong></div>
                  </div>

                  <div>
                    <div style={{ color: PALETTE.text, fontWeight: 700 }}>{new Date(l.timestamp).toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: PALETTE.muted, marginTop: 6 }}>Local time</div>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => copyToClipboard(l.raw || l)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: "transparent",
                        color: PALETTE.muted,
                        border: `1px solid ${PALETTE.subtle}`,
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      Copy
                    </button>

                    <button
                      onClick={() => setSelected(l)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: PALETTE.deepBlue,
                        color: "#fff",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      Details
                    </button>
                  </div>
                </div>
              );
            })
          )}
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

      {/* DETAILS POPUP — clear text (not JSON) */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(2,6,23,0.6)" }} onClick={() => setSelected(null)} />
          <div className="popup" style={{ width: "min(880px, 96%)", maxHeight: "84vh", overflow: "auto", position: "relative", borderRadius: 12, padding: 18, background: `linear-gradient(180deg, ${PALETTE.card}, rgba(14,30,35,0.9))`, border: `1px solid ${PALETTE.subtle}`, zIndex: 130 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: PALETTE.text }}>{selected.type}</div>
                <div style={{ marginTop: 6, color: PALETTE.muted }}>{selected.tokenId} • {selected.serial}</div>
                <div style={{ marginTop: 8, color: PALETTE.muted, fontSize: 13 }}>{new Date(selected.timestamp).toLocaleString()}</div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { copyToClipboard(selected.raw || selected); }} style={{ padding: "8px 10px", borderRadius: 8, background: "transparent", color: PALETTE.muted, border: `1px solid ${PALETTE.subtle}` }}>Copy JSON</button>
                <button onClick={() => setSelected(null)} style={{ padding: "8px 10px", borderRadius: 8, background: PALETTE.magenta, color: "#fff", border: "none", fontWeight: 800 }}>Close</button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
              <div style={{ padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: `1px solid ${PALETTE.subtle}` }}>
                <div style={{ color: PALETTE.muted, fontSize: 12 }}>Actor</div>
                <div style={{ color: PALETTE.text, fontWeight: 800, marginTop: 6 }}>{selected.actor}</div>

                <div style={{ color: PALETTE.muted, fontSize: 12, marginTop: 12 }}>Message</div>
                <div style={{ color: PALETTE.text, marginTop: 6, whiteSpace: "pre-wrap" }}>{selected.message}</div>

                <div style={{ color: PALETTE.muted, fontSize: 12, marginTop: 12 }}>Notes</div>
                <div style={{ color: PALETTE.text, marginTop: 6 }}>{selected.note || "—"}</div>
              </div>

              <div style={{ padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: `1px solid ${PALETTE.subtle}` }}>
                <div style={{ color: PALETTE.muted, fontSize: 12 }}>Status / Approver</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 9999, background: statusColorHex(selected.type) }} />
                  <div style={{ color: PALETTE.text, fontWeight: 800 }}>{selected.type}</div>
                </div>

                <div style={{ color: PALETTE.muted, fontSize: 12, marginTop: 12 }}>Approver</div>
                <div style={{ color: PALETTE.text, fontWeight: 700, marginTop: 6 }}>{selected.approver || "—"}</div>

                {/* Accepted / Rejected details */}
                {selected.acceptedAt && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ color: PALETTE.muted, fontSize: 12 }}>Accepted</div>
                    <div style={{ color: PALETTE.ok, fontWeight: 800, marginTop: 6 }}>{new Date(selected.acceptedAt).toLocaleString()}</div>
                    <div style={{ color: PALETTE.muted, marginTop: 6, fontSize: 13 }}>{selected.note || "Accepted by CFR"}</div>
                  </div>
                )}

                {selected.rejectedAt && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ color: PALETTE.muted, fontSize: 12 }}>Rejected</div>
                    <div style={{ color: PALETTE.danger, fontWeight: 800, marginTop: 6 }}>{new Date(selected.rejectedAt).toLocaleString()}</div>
                    <div style={{ color: PALETTE.muted, marginTop: 6, fontSize: 13 }}>
                      Reason:
                      <div style={{ marginTop: 6, color: PALETTE.text, fontWeight: 700 }}>{selected.reason || "No reason provided"}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* extra full width section for contextual info */}
            <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: "rgba(255,255,255,0.01)", border: `1px solid ${PALETTE.subtle}` }}>
              <div style={{ color: PALETTE.muted, fontSize: 12 }}>Context / Details</div>
              <div style={{ marginTop: 8, color: PALETTE.text, whiteSpace: "pre-wrap" }}>
                {selected.raw && typeof selected.raw === "object"
                  ? `Raw fields:\n${Object.entries(selected.raw)
                      .slice(0, 20)
                      .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
                      .join("\n")}`
                  : "No extra context available."}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
