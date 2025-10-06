// src/CFR/pages/applicant.jsx
import React, { useEffect, useMemo, useState } from "react";

/**
 * applicant.jsx
 * - Self-contained simulated applicants page.
 * - Ensures `handleFlag` and `handleUnflag` are used (no unused-var ESLint errors).
 * - Stores simulation on window.__SIM_STATE so other pages can reuse it.
 * - Uses Tailwind CSS utilities.
 */

/* ---------- Simple helpers ---------- */
function rnd(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function iso(hoursAgo = 0) {
  return new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString();
}
function mk(prefix = "X") {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/* ---------- Simulation initializer (idempotent) ---------- */
function initSimOnce() {
  if (typeof window === "undefined") return null;
  if (window.__SIM_STATE) return window.__SIM_STATE;

  const PROVINCES = [
    "Harare","Bulawayo","Manicaland","Mashonaland Central","Mashonaland East",
    "Mashonaland West","Masvingo","Matabeleland North","Matabeleland South","Midlands"
  ];

  const TOWNS = {
    Harare: ["Harare","Chitungwiza","Epworth"],
    Bulawayo: ["Bulawayo","Esigodini"],
    Manicaland: ["Mutare","Chimanimani","Nyanga"],
    "Mashonaland Central": ["Bindura","Mazowe"],
    "Mashonaland East": ["Marondera","Mudzi"],
    "Mashonaland West": ["Chinhoyi","Karoi"],
    Masvingo: ["Masvingo","Chiredzi"],
    "Matabeleland North": ["Hwange","Binga"],
    "Matabeleland South": ["Beitbridge","Gwanda"],
    Midlands: ["Gweru","Kwekwe","Chirumhanzu"]
  };

  const FIRST = ["James","Anna","Kwame","Lindiwe","Tariro","Brian","Chipo","Michael","Sibongile","Tinashe","Peter","Rudo","Trust","Memory","Tafadzwa","Anesu","Farai","Blessing","Rutendo","Munyaradzi"];
  const LAST = ["Moyo","Ndlovu","Sikhala","Banda","Dube","Chirwa","Gunda","Mlambo","Khumalo","Zuze","Mupfumira"];

  function name(i) {
    return `${FIRST[i % FIRST.length]} ${LAST[i % LAST.length]}`;
  }

  // dealers
  const dealers = [];
  for (let i = 0; i < 12; i++) {
    const province = PROVINCES[i % PROVINCES.length];
    const town = TOWNS[province][0];
    dealers.push({
      id: mk("DEAL"),
      name: `Dealer ${i + 1}`,
      email: `dealer${i + 1}@example.com`,
      province,
      town,
      created_at: iso(24 * (i + 1)),
    });
  }

  // clubs
  const clubs = [];
  for (let i = 0; i < 12; i++) {
    const province = PROVINCES[i % PROVINCES.length];
    const town = TOWNS[province][i % TOWNS[province].length];
    clubs.push({
      id: mk("CLB"),
      name: `Club ${i + 1}`,
      province,
      town,
      hoursRequired: 20 + rnd(0, 30),
      members: [],
    });
  }

  // applicants with apps & tokens
  const applicants = [];
  for (let i = 0; i < 60; i++) {
    const nm = name(i);
    const province = PROVINCES[i % PROVINCES.length];
    const town = TOWNS[province][i % TOWNS[province].length];
    const club = clubs[i % clubs.length];
    const dealer = dealers[i % dealers.length];

    const applications = [];
    const appCount = 1 + (i % 4); // 1..4
    for (let a = 0; a < appCount; a++) {
      const approved = Math.random() > 0.45;
      const tokenCount = approved ? 1 + rnd(0, 2) : 0;
      const tokens = [];
      for (let t = 0; t < tokenCount; t++) {
        tokens.push({ id: mk("TKN"), created_at: iso(rnd(1, 500)), flagged: Math.random() > 0.98 });
      }
      applications.push({
        id: mk("APP"),
        created_at: iso(rnd(1, 800)),
        approved,
        reason: approved ? "Passed checks" : ["Missing ID", "Invalid docs", "Failed audit"][rnd(0, 2)],
        tokens,
        audit: { auditor: mk("AUD"), notes: Math.random() > 0.6 ? "All good" : "Minor discrepancy", timestamp: iso(rnd(1, 400)) },
      });
    }

    const wallet = applications.flatMap((a) => a.tokens.map((t) => ({ ...t })));

    applicants.push({
      id: mk("APPL"),
      name: nm,
      phone: `+2637${rnd(10000000, 99999999)}`,
      email: `${nm.replace(" ", "").toLowerCase()}${i}@example.com`,
      province,
      town,
      dealer: dealer.id,
      club: club.id,
      created_at: iso(24 * (i + 1)),
      applications,
      wallet,
      audits: applications.map((a) => ({ id: mk("AUD"), status: a.approved ? "approved" : "declined", reason: a.reason, date: a.audit.timestamp })),
    });
  }

  // attach members to clubs
  clubs.forEach((c, idx) => {
    const members = applicants.filter((ap, i) => i % clubs.length === idx).slice(0, 8);
    c.members = members.map((m) => ({ id: m.id, name: m.name, hoursLogged: rnd(0, 60), applications: m.applications }));
  });

  // policeStations (basic)
  const policeStations = [];
  PROVINCES.forEach((prov) => {
    const towns = TOWNS[prov];
    towns.forEach((t) => {
      for (let k = 0; k < 2; k++) {
        policeStations.push({
          id: mk("PS"),
          name: `${t} PS ${k + 1}`,
          province: prov,
          town: t,
          inCharge: { id: mk("OFF"), name: name(rnd(0, FIRST.length - 1)) },
          approvals: [],
          declines: [],
        });
      }
    });
  });

  // policeActions
  const policeActions = [];
  applicants.forEach((ap) => {
    ap.applications.forEach((app) => {
      const ps = policeStations[rnd(0, policeStations.length - 1)];
      const action = {
        id: mk("ACT"),
        application: app.id,
        applicant: ap.id,
        station: ps.id,
        stationName: ps.name,
        town: ps.town,
        province: ps.province,
        approved: app.approved,
        by: ps.inCharge.name,
        reason: app.reason,
        date: app.created_at,
      };
      policeActions.push(action);
      if (action.approved) ps.approvals.push(action);
      else ps.declines.push(action);
    });
  });

  const flaggedTokens = applicants.flatMap((ap) => ap.wallet.filter((t) => t.flagged).map((t) => ({ ...t, owner: ap.id, ownerName: ap.name })));
  const audits = applicants.flatMap((ap) => ap.audits.map((a) => ({ ...a, applicant: ap.id, name: ap.name })));
  const intFlagged = applicants.flatMap((ap) => ap.applications.filter((a) => a.tokens.some((t) => t.flagged)).map((a) => ({ ...a, applicantId: ap.id, applicantName: ap.name })));
  const mojRecords = applicants.flatMap((ap) => ap.applications.map((a) => ({ ...a, applicantId: ap.id, applicantName: ap.name })));

  window.__SIM_STATE = { dealers, clubs, applicants, policeStations, policeActions, flaggedTokens, audits, intFlagged, mojRecords };
  return window.__SIM_STATE;
}

/* ---------- Mutators used in UI (must be used to avoid unused-vars) ---------- */
function flagTokenGlobal(tokenId, ownerId, reason = "Flagged manually") {
  const state = window.__SIM_STATE;
  if (!state) return null;
  state.applicants.forEach((ap) => {
    if (ap.id === ownerId) {
      ap.wallet = ap.wallet.map((w) => (w.id === tokenId ? { ...w, flagged: true, flaggedReason: reason } : w));
      ap.applications = ap.applications.map((app) => ({ ...app, tokens: app.tokens.map((t) => (t.id === tokenId ? { ...t, flagged: true, flaggedReason: reason } : t)) }));
    }
  });
  state.flaggedTokens = state.applicants.flatMap((ap) => ap.wallet.filter((t) => t.flagged).map((t) => ({ ...t, owner: ap.id, ownerName: ap.name })));
  return state;
}
function unflagTokenGlobal(tokenId, ownerId) {
  const state = window.__SIM_STATE;
  if (!state) return null;
  state.applicants.forEach((ap) => {
    if (ap.id === ownerId) {
      ap.wallet = ap.wallet.map((w) => (w.id === tokenId ? { ...w, flagged: false, flaggedReason: null } : w));
      ap.applications = ap.applications.map((app) => ({ ...app, tokens: app.tokens.map((t) => (t.id === tokenId ? { ...t, flagged: false, flaggedReason: null } : t)) }));
    }
  });
  state.flaggedTokens = state.applicants.flatMap((ap) => ap.wallet.filter((t) => t.flagged).map((t) => ({ ...t, owner: ap.id, ownerName: ap.name })));
  return state;
}

/* ---------- Applicant page component ---------- */
export default function ApplicantPage() {
  const [sim, setSim] = useState(null);
  const [selectedApplicant, setSelectedApplicant] = useState(null);

  useEffect(() => {
    const s = initSimOnce();
    setSim(s);
  }, []);

  const applicants = useMemo(() => (sim?.applicants || []), [sim]);

  /* functions intentionally used in JSX below to avoid 'defined but never used' */
  function handleFlag(tokenId, ownerId) {
    flagTokenGlobal(tokenId, ownerId, "Flagged from applicant page");
    // refresh local state reference so UI updates
    setSim({ ...window.__SIM_STATE });
    setSelectedApplicant((prev) => (prev ? { ...window.__SIM_STATE.applicants.find((a) => a.id === prev.id) } : prev));
  }

  function handleUnflag(tokenId, ownerId) {
    unflagTokenGlobal(tokenId, ownerId);
    setSim({ ...window.__SIM_STATE });
    setSelectedApplicant((prev) => (prev ? { ...window.__SIM_STATE.applicants.find((a) => a.id === prev.id) } : prev));
  }

  if (!sim) return null;

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold" style={{ color: "#568319" }}>Applicants (simulated)</h1>
          <div className="text-sm text-gray-500">Total: {applicants.length}</div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {applicants.map((ap) => {
            const passed = ap.applications.filter((a) => a.approved).length;
            const flaggedCount = ap.wallet.filter((t) => t.flagged).length;
            return (
              <div key={ap.id} className="p-3 rounded-lg border bg-white flex justify-between items-center">
                <div>
                  <div className="font-semibold">{ap.name} <span className="text-xs text-gray-500">({ap.id})</span></div>
                  <div className="text-xs text-gray-500">{ap.town}, {ap.province} · Club {ap.club} · Dealer {ap.dealer}</div>
                  <div className="text-xs mt-1">Applications: <strong>{ap.applications.length}</strong> • Passed: <strong className="text-green-700">{passed}</strong> • Flagged tokens: <strong className="text-red-600">{flaggedCount}</strong></div>
                </div>

                <div className="flex flex-col gap-2">
                  <button onClick={() => setSelectedApplicant(ap)} className="px-3 py-1 rounded bg-green-600 text-white text-sm">Details</button>
                  <button onClick={() => setSelectedApplicant(ap)} className="px-3 py-1 rounded border text-sm bg-white">Wallet</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Details / Wallet modal */}
      {selectedApplicant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg w-11/12 max-w-4xl p-6 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xl font-bold">{selectedApplicant.name} <span className="text-xs text-gray-500">({selectedApplicant.id})</span></div>
                <div className="text-xs text-gray-500">{selectedApplicant.town}, {selectedApplicant.province}</div>
                <div className="text-xs text-gray-500 mt-1">Club: {selectedApplicant.club} • Dealer: {selectedApplicant.dealer}</div>
              </div>
              <div>
                <button onClick={() => { setSelectedApplicant(null); }} className="px-3 py-1 rounded border">Close</button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold">Applications</h4>
                <div className="space-y-2 mt-2">
                  {selectedApplicant.applications.map((a) => (
                    <div key={a.id} className="p-2 rounded border flex justify-between items-center">
                      <div>
                        <div className="font-semibold">{a.id}</div>
                        <div className="text-xs text-gray-500">Submitted: {new Date(a.created_at).toLocaleString()}</div>
                        <div className="text-xs mt-1">Audit note: {a.audit?.notes}</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${a.approved ? "text-green-700" : "text-red-700"}`}>{a.approved ? "APPROVED" : "DECLINED"}</div>
                        <div className="text-xs mt-1">Tokens: {a.tokens.length}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold">Wallet</h4>
                <div className="mt-2 space-y-2">
                  {selectedApplicant.wallet.length === 0 && <div className="text-sm text-gray-500">No tokens</div>}
                  {selectedApplicant.wallet.map((t) => (
                    <div key={t.id} className="p-2 rounded border flex justify-between items-center">
                      <div>
                        <div className="font-mono">{t.id}</div>
                        <div className="text-xs text-gray-500">Created: {new Date(t.created_at).toLocaleDateString()}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {t.flagged ? <span className="text-xs text-red-700 font-bold">FLAGGED</span> : null}
                        {t.flagged ? (
                          <button onClick={() => handleUnflag(t.id, selectedApplicant.id)} className="px-2 py-1 rounded border text-xs">Unflag</button>
                        ) : (
                          <button onClick={() => handleFlag(t.id, selectedApplicant.id)} className="px-2 py-1 rounded bg-red-600 text-white text-xs">Flag</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <h4 className="font-semibold">Audits</h4>
                  <ul className="text-sm text-gray-600 mt-2 space-y-1">
                    {selectedApplicant.audits.map((a) => (
                      <li key={a.id}>{new Date(a.date).toLocaleString()} — {a.status.toUpperCase()} — {a.reason}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
