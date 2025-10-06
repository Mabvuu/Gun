// src/CFR/pages/dealer.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

/**
 * Clean Dealer page (simulation fallback) — no unused vars, no eslint disables.
 * - Left: dealer list (searchable)
 * - Center: selected dealer details with sections (locations, guns, audits, transfers & sales)
 * - Right: summary
 */

const THEME = {
  muted: "#6B7280",
  accent: "#16A34A",
  accent2: "#0EA5A4",
  danger: "#DC2626",
};

function iso(hoursAgo = 0) {
  return new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString();
}
function makeToken() {
  return `TKN-${Math.random().toString(36).slice(2, 12).toUpperCase()}`;
}

function generateSimulation(dealerCount = 8) {
  const provinceTown = [
    ["Harare", "Borrowdale"],
    ["Harare", "Chitungwiza"],
    ["Bulawayo", "Bulawayo"],
    ["Manicaland", "Mutare"],
    ["Masvingo", "Masvingo"],
    ["Midlands", "Gweru"],
    ["Matabeleland North", "Hwange"],
    ["Mashonaland East", "Marondera"],
  ];
  const models = ["Viper 9", "Falcon X", "Scout 12", "Predator 7", "Ranger 5", "Sentinel 11"];
  const dealers = [];
  const guns = [];
  const sales = [];
  const transfers = [];
  const events = [];

  for (let i = 0; i < dealerCount; i++) {
    const id = `D-${1000 + i}`;
    const [province, town] = provinceTown[i % provinceTown.length];
    const dealer = {
      id,
      email: `dealer${i + 1}@arms.example`,
      name: `Dealer ${i + 1}`,
      town,
      province,
      created_at: iso(24 * (i + 1)),
    };
    dealers.push(dealer);

    const gunCount = 15 + Math.floor(Math.random() * 11); // 15..25 guns each
    for (let g = 0; g < gunCount; g++) {
      const gid = `G-${id}-${g + 1}`;
      const token = makeToken();
      const model = models[(i + g) % models.length];
      const createdAtHours = i * 2 + g;
      guns.push({
        id: gid,
        model,
        token_id: token,
        created_by: id,
        created_at: iso(createdAtHours),
      });

      // multiple sales per gun (1..3)
      const saleCount = 1 + (Math.floor(Math.random() * 3));
      for (let s = 0; s < saleCount; s++) {
        sales.push({
          id: `S-${gid}-${s + 1}`,
          gun_id: gid,
          created_by: id,
          buyer: `buyer${(i + g + s) % 80}@example`,
          price: (900 + (i + g + s) * 12).toFixed(2),
          status: Math.random() > 0.3 ? "completed" : "pending",
          created_at: iso(createdAtHours + s),
        });
      }

      // transfers (0..2)
      const transCount = Math.floor(Math.random() * 3);
      for (let t = 0; t < transCount; t++) {
        transfers.push({
          id: `T-${gid}-${t + 1}`,
          gun_id: gid,
          created_by: id,
          to_address: `0x${Math.random().toString(16).slice(2, 12)}`,
          status: Math.random() > 0.5 ? "success" : "pending",
          created_at: iso(createdAtHours + t * 0.5),
        });
      }

      // audits (1..3)
      const auditCount = 1 + Math.floor(Math.random() * 3);
      for (let a = 0; a < auditCount; a++) {
        const approved = Math.random() > 0.82 ? false : true;
        events.push({
          id: `E-${gid}-${a + 1}`,
          actor_id: id,
          action: "audit",
          result: approved ? "approved" : "declined",
          reason: approved ? "All good" : ["Missing document", "Invalid ID", "Fake endorsement"][Math.floor(Math.random() * 3)],
          details: { gun: gid, note: "Simulated audit record" },
          created_at: iso(createdAtHours + a * 0.25),
        });
      }
    }
  }

  return { dealers, guns, sales, transfers, events };
}

export default function DealerPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedDealerId, setSelectedDealerId] = useState(null);
  const [section, setSection] = useState("overview");
  const [search, setSearch] = useState("");
  const [copiedToken, setCopiedToken] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setErrorMsg("");
      try {
        const res = await axios.get("/api/dealer/activity");
        if (!mounted) return;
        if (res?.data && Object.keys(res.data).length) {
          const { users, guns, sales, transfers, events } = res.data;
          setData({
            dealers: users || [],
            guns: guns || [],
            sales: sales || [],
            transfers: transfers || [],
            events: events || [],
          });
        } else {
          setData(generateSimulation(8));
        }
      } catch (err) {
        // use simulation on error and show message
        setData(generateSimulation(8));
        setErrorMsg("Failed to load API — showing simulated data.");
        // console.error intentionally not removed: it's helpful and not flagged as unused
       
        console.error("Load error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const { dealers = [], guns = [], sales = [], transfers = [], events = [] } = data || {
    dealers: [],
    guns: [],
    sales: [],
    transfers: [],
    events: [],
  };

  // grouped by dealer id — used below
  const grouped = useMemo(() => {
    const map = {};
    dealers.forEach((d) => {
      map[d.id] = { dealer: d, guns: [], sales: [], transfers: [], events: [] };
    });
    guns.forEach((g) => {
      if (g.created_by && map[g.created_by]) map[g.created_by].guns.push(g);
    });
    sales.forEach((s) => {
      if (s.created_by && map[s.created_by]) map[s.created_by].sales.push(s);
    });
    transfers.forEach((t) => {
      if (t.created_by && map[t.created_by]) map[t.created_by].transfers.push(t);
    });
    events.forEach((e) => {
      if (e.actor_id && map[e.actor_id]) map[e.actor_id].events.push(e);
    });
    return map;
  }, [dealers, guns, sales, transfers, events]);

  const list = useMemo(() => Object.values(grouped), [grouped]);

  const filtered = list.filter(({ dealer }) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      dealer.id.toLowerCase().includes(q) ||
      (dealer.name && dealer.name.toLowerCase().includes(q)) ||
      (dealer.town && dealer.town.toLowerCase().includes(q)) ||
      (dealer.province && dealer.province.toLowerCase().includes(q)) ||
      (dealer.email && dealer.email.toLowerCase().includes(q))
    );
  });

  const selectedObj = selectedDealerId ? grouped[selectedDealerId] : null;

  function selectDealer(id) {
    setSelectedDealerId(id);
    setSection("overview");
    setCopiedToken(null);
  }

  function copyToken(t) {
    navigator.clipboard?.writeText(t).catch(() => {});
    setCopiedToken(t);
    setTimeout(() => setCopiedToken(null), 1200);
  }

  // UI
  return (
    <div style={{ display: "flex", gap: 20, padding: 18, fontFamily: "Inter, system-ui, Arial" }}>
      {/* LEFT */}
      <aside style={{ width: 340 }}>
        <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>Dealers</div>
            <div style={{ color: THEME.muted, fontSize: 13 }}>{dealers.length} total</div>
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <input
            placeholder="Search dealer, town, province..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #E6E6E6" }}
          />
        </div>

        <div style={{ maxHeight: "72vh", overflow: "auto", paddingRight: 6 }}>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {loading && <li style={{ color: THEME.muted, padding: 12 }}>Loading…</li>}
            {!loading && filtered.length === 0 && <li style={{ color: THEME.muted, padding: 12 }}>No dealers found</li>}
            {!loading &&
              filtered.map(({ dealer, guns: dg, sales: ds, transfers: dt, events: de }) => (
                <li
                  key={dealer.id}
                  onClick={() => selectDealer(dealer.id)}
                  style={{
                    cursor: "pointer",
                    padding: 12,
                    borderRadius: 10,
                    border: selectedDealerId === dealer.id ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(2,6,23,0.04)",
                    background: selectedDealerId === dealer.id ? "#ECFDF5" : "#fff",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{dealer.name}</div>
                      <div style={{ color: THEME.muted, fontSize: 12 }}>{dealer.email}</div>
                      <div style={{ color: THEME.muted, fontSize: 12, marginTop: 6 }}>{dealer.town}, {dealer.province}</div>
                      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                        <small style={{ padding: "4px 8px", borderRadius: 8, background: "#ECFDF5", fontWeight: 800 }}>G {dg.length}</small>
                        <small style={{ padding: "4px 8px", borderRadius: 8, background: "#EFF6FF", fontWeight: 800 }}>S {ds.length}</small>
                        <small style={{ padding: "4px 8px", borderRadius: 8, background: "#FFF7ED", fontWeight: 800 }}>T {dt.length}</small>
                        <small style={{ padding: "4px 8px", borderRadius: 8, background: "#FEF3C7", fontWeight: 800 }}>A {de.length}</small>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: THEME.muted, fontSize: 12 }}>{new Date(dealer.created_at).toLocaleDateString()}</div>
                      <div style={{ marginTop: 8 }}>
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation();
                            selectDealer(dealer.id);
                          }}
                          style={{ padding: "6px 8px", borderRadius: 8, background: "#111827", color: "#fff", border: "none", cursor: "pointer" }}
                        >
                          Open
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        </div>
      </aside>

      {/* CENTER */}
      <main style={{ flex: 1 }}>
        {errorMsg && <div style={{ marginBottom: 12, color: THEME.danger }}>{errorMsg}</div>}

        {!selectedObj && !loading && (
          <div style={{ padding: 18, borderRadius: 12, background: "#fff", border: "1px solid rgba(2,6,23,0.04)" }}>
            <div style={{ fontSize: 20, fontWeight: 900 }}>Dealer Activity</div>
            <p style={{ color: THEME.muted }}>
              Click a dealer to inspect locations, minted guns & tokens, audits (with reasons), and transfers/sales. Each dealer contains many records for testing.
            </p>
          </div>
        )}

        {selectedObj && (
          <div style={{ display: "flex", gap: 12, flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900 }}>{selectedObj.dealer.name}</div>
                <div style={{ color: THEME.muted }}>{selectedObj.dealer.email} — {selectedObj.dealer.town}, {selectedObj.dealer.province}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <SectionButton active={section === "overview"} onClick={() => setSection("overview")}>#1 Locations</SectionButton>
                <SectionButton active={section === "guns"} onClick={() => setSection("guns")}>#2 Guns</SectionButton>
                <SectionButton active={section === "audits"} onClick={() => setSection("audits")}>#3 Audits</SectionButton>
                <SectionButton active={section === "transfers"} onClick={() => setSection("transfers")}>#4 Transfers & Sales</SectionButton>
              </div>
            </div>

            <div style={{ padding: 14, borderRadius: 10, background: "#fff", border: "1px solid rgba(2,6,23,0.04)" }}>
              {section === "overview" && (
                <OverviewPanel selectedObj={selectedObj} />
              )}

              {section === "guns" && (
                <div>
                  <h3 style={{ marginBottom: 8 }}>Minted guns ({selectedObj.guns.length})</h3>
                  <div style={{ display: "grid", gap: 10 }}>
                    {selectedObj.guns.map(g => (
                      <div key={g.id} style={{ display: "flex", justifyContent: "space-between", padding: 10, borderRadius: 8, border: "1px solid rgba(0,0,0,0.03)" }}>
                        <div>
                          <div style={{ fontWeight: 800 }}>{g.model}</div>
                          <div style={{ color: THEME.muted, fontSize: 12 }}>id: {g.id}</div>
                        </div>
                        <div style={{ textAlign: "right", minWidth: 220 }}>
                          <div style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>{g.token_id}</div>
                          <div style={{ marginTop: 8, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button onClick={() => copyToken(g.token_id)} style={smallButton}>{copiedToken === g.token_id ? "Copied" : "Copy token"}</button>
                            <button onClick={() => alert(`Inspect ${g.id}`)} style={smallButtonAlt}>Inspect</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {section === "audits" && (
                <div>
                  <h3 style={{ marginBottom: 8 }}>Audit records ({selectedObj.events.length})</h3>
                  <div style={{ display: "grid", gap: 10 }}>
                    {selectedObj.events.map(ev => (
                      <div key={ev.id} style={{ display: "flex", justifyContent: "space-between", padding: 10, borderRadius: 8, background: ev.result === "approved" ? "#ECFDF5" : "#FFF1F2", border: "1px solid rgba(0,0,0,0.03)" }}>
                        <div>
                          <div style={{ fontWeight: 800 }}>{ev.action} — {new Date(ev.created_at).toLocaleString()}</div>
                          <div style={{ color: THEME.muted }}>{ev.details?.note}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 900, color: ev.result === "approved" ? THEME.accent : THEME.danger }}>{ev.result.toUpperCase()}</div>
                          <div style={{ color: THEME.muted, marginTop: 6 }}>{ev.reason}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {section === "transfers" && (
                <div>
                  <h3 style={{ marginBottom: 8 }}>Transfers & Sales</h3>
                  <div style={{ display: "grid", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 800, marginBottom: 6 }}>Transfers ({selectedObj.transfers.length})</div>
                      {selectedObj.transfers.map(t => (
                        <div key={t.id} style={{ padding: 10, borderRadius: 8, border: "1px solid rgba(0,0,0,0.03)" , display:"flex", justifyContent:"space-between" }}>
                          <div>
                            <div style={{ fontWeight: 800 }}>{t.gun_id}</div>
                            <div style={{ color: THEME.muted, marginTop: 6 }}>To: {t.to_address}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontWeight: 900 }}>{t.status}</div>
                            <div style={{ color: THEME.muted, marginTop: 6 }}>{new Date(t.created_at).toLocaleString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div>
                      <div style={{ fontWeight: 800, marginBottom: 6 }}>Sales ({selectedObj.sales.length})</div>
                      {selectedObj.sales.map(s => (
                        <div key={s.id} style={{ padding: 10, borderRadius: 8, border: "1px solid rgba(0,0,0,0.03)" , display:"flex", justifyContent:"space-between" }}>
                          <div>
                            <div style={{ fontWeight: 800 }}>{s.gun_id}</div>
                            <div style={{ color: THEME.muted, marginTop: 6 }}>Buyer: {s.buyer}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontWeight: 900 }}>{s.status}</div>
                            <div style={{ color: THEME.muted, marginTop: 6 }}>{s.price ? `$${s.price}` : ""}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* RIGHT */}
      <aside style={{ width: 300 }}>
        <div style={{ padding: 12, borderRadius: 12, background: "#fff", border: "1px solid rgba(2,6,23,0.04)" }}>
          <div style={{ fontSize: 14, fontWeight: 900 }}>Summary</div>

          <div style={{ marginTop: 12 }}>
            <div style={{ color: THEME.muted }}>Dealers</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: THEME.accent }}>{dealers.length}</div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ color: THEME.muted }}>Minted guns</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: THEME.accent2 }}>{guns.length}</div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ color: THEME.muted }}>Sales</div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{sales.length}</div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ color: THEME.muted }}>Transfers</div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{transfers.length}</div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ color: THEME.muted }}>Audits</div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{events.length}</div>
          </div>

          <div style={{ marginTop: 14 }}>
            <button
              onClick={() => {
                if (!selectedDealerId && dealers[0]) selectDealerFromSummary(dealers[0].id, setSelectedDealerId, setSection);
              }}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "#111827", color: "#fff", border: "none", cursor: "pointer", fontWeight: 800 }}
            >
              {selectedDealerId ? "Viewing dealer" : "Quick open first dealer"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* helpers used in JSX - defined after to avoid hoisting confusion */
function SectionButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 12px",
        borderRadius: 10,
        border: active ? "none" : "1px solid rgba(2,6,23,0.06)",
        background: active ? "#F3F4F6" : "#fff",
        fontWeight: 800,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function OverviewPanel({ selectedObj }) {
  const THEME_LOCAL = THEME;
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ padding: 12, borderRadius: 8, background: "#F8FEF9" }}>
          <div style={{ fontWeight: 800 }}>{selectedObj.dealer.town}</div>
          <div style={{ color: THEME_LOCAL.muted }}>{selectedObj.dealer.province}</div>
          <div style={{ marginTop: 6, color: THEME_LOCAL.muted }}>Registered: {new Date(selectedObj.dealer.created_at).toLocaleString()}</div>
        </div>
      </div>
      <div style={{ width: 240 }}>
        <div style={{ padding: 12, borderRadius: 8, background: "#fff", border: "1px solid rgba(0,0,0,0.03)" }}>
          <div style={{ fontWeight: 800 }}>Quick stats</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
            <Stat label="Guns" value={selectedObj.guns.length} color="#D1FAE5" />
            <Stat label="Sales" value={selectedObj.sales.length} color="#DBEAFE" />
            <Stat label="Transfers" value={selectedObj.transfers.length} color="#FFF7ED" />
            <Stat label="Audits" value={selectedObj.events.length} color="#FEF3C7" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ padding: 8, borderRadius: 8, background: color, textAlign: "center", fontWeight: 800 }}>
      <div style={{ fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 16 }}>{value}</div>
    </div>
  );
}

const smallButton = {
  padding: "6px 8px",
  borderRadius: 8,
  border: "1px solid rgba(0,0,0,0.06)",
  background: "#111827",
  color: "#fff",
  cursor: "pointer",
  fontSize: 13,
};

const smallButtonAlt = {
  padding: "6px 8px",
  borderRadius: 8,
  border: "1px solid rgba(0,0,0,0.06)",
  background: "#fff",
  cursor: "pointer",
  fontSize: 13,
};

function selectDealerFromSummary(id, setSelectedDealerId, setSection) {
  setSelectedDealerId(id);
  setSection("overview");
}
