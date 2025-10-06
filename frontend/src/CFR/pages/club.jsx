// frontend/src/Club.jsx
import React, { useEffect, useMemo, useState } from "react";

/**
 * Club.jsx
 * Simulated clubs + members + applications UI
 * Uses Tailwind CSS (make sure Tailwind is configured in your project)
 *
 * Palette used:
 *  - #6A2B09
 *  - #C5620B
 *  - #FCB861
 *  - #6F7781
 *  - #040404
 */

const COLORS = {
  brownDeep: "#6A2B09",
  orange: "#C5620B",
  lightApricot: "#FCB861",
  slate: "#6F7781",
  black: "#040404",
};

function rnd(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function fakeName(idx) {
  const first = ["James", "Anna", "Kwame", "Lindiwe", "Tariro", "Brian", "Chipo", "Michael", "Sibongile", "Tinashe", "Peter", "Rudo"];
  const last = ["Moyo", "Ndlovu", "Sikhala", "Banda", "Dube", "Chirwa", "Gunda", "Mlambo", "Khumalo", "Zuze"];
  return `${first[idx % first.length]} ${last[idx % last.length]}`;
}

function reasons() {
  return ["Missing ID", "Invalid endorsement", "Incomplete training hours", "Docs mismatch", "All good"];
}

function genClubs(count = 12) {
  const provinces = ["Harare", "Bulawayo", "Mutare", "Gweru", "Masvingo", "Bindura", "Beitbridge", "Hwange"];
  const towns = ["CBD", "Borrowdale", "Chitungwiza", "Arcturus", "Chiredzi", "Karoi", "Esigodini", "Chimanimani"];
  const clubs = [];
  for (let i = 1; i <= count; i++) {
    const id = `CLB-${100 + i}`;
    const membersCount = 6 + Math.floor(Math.random() * 8); // 6..13
    const members = [];
    const hoursRequired = 20 + Math.floor(Math.random() * 21); // 20..40
    for (let m = 0; m < membersCount; m++) {
      const idm = `${id}-MB-${m + 1}`;
      const hoursLogged = rnd(0, 60);
      // each member has 1..4 applications (historic)
      const apps = new Array(rnd(1, 4)).fill(0).map((_, ai) => {
        const approved = Math.random() > 0.45 && hoursLogged >= hoursRequired;
        const reason = approved ? "Approved" : reasons()[Math.floor(Math.random() * (reasons().length - 1))];
        return {
          id: `${idm}-APP-${ai + 1}`,
          created_at: new Date(Date.now() - rnd(1, 60) * 3600 * 1000).toISOString(),
          approved,
          reason,
        };
      });

      members.push({
        id: idm,
        name: fakeName(m),
        hoursLogged,
        apps,
      });
    }

    // club-level accepted/declined summary from member apps
    const flatApps = members.flatMap((mb) => mb.apps);
    clubs.push({
      id,
      name: `Shooters Club ${i}`,
      town: towns[i % towns.length],
      province: provinces[i % provinces.length],
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
      hoursRequired,
      members,
      apps: flatApps,
    });
  }
  return clubs;
}

export default function Club() {
  const [clubs, setClubs] = useState([]);
  const [selectedClubId, setSelectedClubId] = useState(null);
  const [activeTab, setActiveTab] = useState("members"); // members | applications | rules
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // simulate load
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      setClubs(genClubs(12));
      setLoading(false);
    }, 350);
    return () => clearTimeout(t);
  }, []);

  const selectedClub = useMemo(() => clubs.find((c) => c.id === selectedClubId) || clubs[0] || null, [clubs, selectedClubId]);

  // derived stats to show in right column
  const totals = useMemo(() => {
    const totalClubs = clubs.length;
    const totalMembers = clubs.reduce((s, c) => s + c.members.length, 0);
    const totalApps = clubs.reduce((s, c) => s + c.apps.length, 0);
    const accepted = clubs.reduce((s, c) => s + c.apps.filter((a) => a.approved).length, 0);
    const declined = totalApps - accepted;
    return { totalClubs, totalMembers, totalApps, accepted, declined };
  }, [clubs]);

  const filteredClubs = useMemo(() => {
    if (!query.trim()) return clubs;
    const q = query.trim().toLowerCase();
    return clubs.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.town.toLowerCase().includes(q) ||
        c.province.toLowerCase().includes(q)
    );
  }, [clubs, query]);

  // helper UI small components
  const Pill = ({ children, className = "" }) => (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${className}`}>{children}</div>
  );

  return (
    <div className="min-h-screen p-6 bg-gradient-to-b" style={{ background: `linear-gradient(180deg, ${COLORS.lightApricot}10, #fff 30%)` }}>
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-6">
        {/* Left: club list */}
        <aside className="col-span-3 bg-white rounded-2xl shadow-md p-4 h-[80vh] overflow-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-extrabold" style={{ color: COLORS.brownDeep }}>Clubs</h2>
              <div className="text-xs text-gray-500">{totals.totalClubs} clubs · {totals.totalMembers} members</div>
            </div>
            <div>
              <span className="text-xs font-semibold" style={{ color: COLORS.orange }}>Sim</span>
            </div>
          </div>

          <div className="mb-3">
            <input
              className="w-full px-3 py-2 rounded-lg border text-sm"
              placeholder="Search club, town or province..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {loading && <div className="text-sm text-gray-500 p-4">Loading clubs…</div>}

          <ul className="space-y-3">
            {filteredClubs.map((c) => {
              const isActive = selectedClub?.id === c.id;
              return (
                <li
                  key={c.id}
                  onClick={() => { setSelectedClubId(c.id); setActiveTab("members"); }}
                  className={`cursor-pointer p-3 rounded-xl flex flex-col gap-2 transition-shadow ${isActive ? "shadow-lg border" : "hover:shadow-sm"}`}
                  style={{ borderColor: isActive ? COLORS.orange : "transparent", borderWidth: isActive ? 1 : 0, background: isActive ? "#FFF7ED" : "white" }}
                >
                  <div className="flex justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate" style={{ color: COLORS.black }}>{c.name}</div>
                      <div className="text-xs text-gray-500 truncate">{c.town}, {c.province}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString()}</div>
                      <div className="mt-1 text-xs">
                        <Pill className="bg-orange-100 text-orange-800" >G {c.members.length}</Pill>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] px-2 py-0.5 rounded-md" style={{ background: "#FEF3C7", fontWeight: 700 }}>{c.hoursRequired}h req</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md" style={{ background: "#EFF6FF" }}>{c.apps.length} apps</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Center: details */}
        <main className="col-span-6">
          {!selectedClub && (
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h3 className="text-2xl font-extrabold" style={{ color: COLORS.brownDeep }}>Clubs overview</h3>
              <p className="text-sm text-gray-600 mt-2">Click a club on the left to view members, applications, and approval rules. Each club has simulated data for testing and design.</p>

              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="p-4 rounded-xl bg-white border">
                  <div className="text-xs text-gray-500">Total clubs</div>
                  <div className="text-xl font-bold" style={{ color: COLORS.orange }}>{totals.totalClubs}</div>
                </div>
                <div className="p-4 rounded-xl bg-white border">
                  <div className="text-xs text-gray-500">Total members</div>
                  <div className="text-xl font-bold" style={{ color: COLORS.brownDeep }}>{totals.totalMembers}</div>
                </div>
                <div className="p-4 rounded-xl bg-white border">
                  <div className="text-xs text-gray-500">Applications</div>
                  <div className="text-xl font-bold" style={{ color: COLORS.lightApricot }}>{totals.totalApps}</div>
                </div>
              </div>
            </div>
          )}

          {selectedClub && (
            <div className="bg-white rounded-2xl shadow-md p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-extrabold" style={{ color: COLORS.brownDeep }}>{selectedClub.name}</h3>
                  <div className="text-sm text-gray-500">{selectedClub.town}, {selectedClub.province} · Created {new Date(selectedClub.created_at).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Hours required</div>
                  <div className="text-lg font-bold" style={{ color: COLORS.orange }}>{selectedClub.hoursRequired} h</div>
                </div>
              </div>

              {/* tabs */}
              <div className="mt-5 flex gap-2 items-center">
                <button
                  onClick={() => setActiveTab("members")}
                  className={`px-3 py-2 rounded-lg font-semibold ${activeTab === "members" ? "bg-orange-50 text-orange-700" : "bg-gray-100 text-gray-700"}`}
                >
                  Members
                </button>
                <button
                  onClick={() => setActiveTab("applications")}
                  className={`px-3 py-2 rounded-lg font-semibold ${activeTab === "applications" ? "bg-orange-50 text-orange-700" : "bg-gray-100 text-gray-700"}`}
                >
                  Applications
                </button>
                <button
                  onClick={() => setActiveTab("rules")}
                  className={`px-3 py-2 rounded-lg font-semibold ${activeTab === "rules" ? "bg-orange-50 text-orange-700" : "bg-gray-100 text-gray-700"}`}
                >
                  Rules
                </button>
              </div>

              <div className="mt-6">
                {activeTab === "members" && (
                  <div className="space-y-3">
                    {selectedClub.members.map((m) => {
                      const canApprove = m.hoursLogged >= selectedClub.hoursRequired;
                      return (
                        <div key={m.id} className="p-3 rounded-lg border flex items-center justify-between bg-white">
                          <div>
                            <div className="font-semibold">{m.name}</div>
                            <div className="text-xs text-gray-500">Hours logged: <span className="font-medium">{m.hoursLogged}h</span> — {canApprove ? <span className="text-green-600 font-bold">Eligible</span> : <span className="text-red-600 font-bold">Needs {selectedClub.hoursRequired - m.hoursLogged}h</span>}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-400">Applications</div>
                            <div className="mt-1 flex flex-col items-end gap-1">
                              {m.apps.map((a) => (
                                <div key={a.id} className="text-xs">
                                  <span className={`px-2 py-1 rounded-full text-[11px] ${a.approved ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                    {a.approved ? "ACCEPTED" : "DECLINED"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeTab === "applications" && (
                  <div className="space-y-3">
                    {selectedClub.apps.map((a) => (
                      <div key={a.id} className="p-3 rounded-lg border flex items-center justify-between bg-white">
                        <div>
                          <div className="font-semibold text-sm">{a.id}</div>
                          <div className="text-xs text-gray-500">Submitted {new Date(a.created_at).toLocaleString()}</div>
                          <div className="text-xs text-gray-600 mt-1">Reason: {a.reason}</div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold ${a.approved ? "text-green-600" : "text-red-600"}`}>{a.approved ? "ACCEPTED" : "DECLINED"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "rules" && (
                  <div>
                    <div className="p-4 rounded-lg border bg-white">
                      <div className="font-bold">Approval rules for {selectedClub.name}</div>
                      <ul className="list-disc ml-5 mt-2 text-sm text-gray-600">
                        <li>Members must log at least <strong>{selectedClub.hoursRequired} hours</strong> of supervised range time.</li>
                        <li>All identity documents & club endorsement must be present.</li>
                        <li>Incomplete or suspicious documents will result in a declined application with reason provided.</li>
                        <li>Club committee reviews applications weekly.</li>
                      </ul>
                      <div className="mt-3 text-xs text-gray-500">Note: these rules are simulated for the demo.</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Right: quick stats */}
        <aside className="col-span-3">
          <div className="bg-white rounded-2xl shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold" style={{ color: COLORS.brownDeep }}>Club summary</h4>
                <div className="text-xs text-gray-500">Quick glance</div>
              </div>
              <div className="text-sm font-extrabold" style={{ color: COLORS.orange }}>{totals.totalClubs}</div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-600">Total members</div>
                <div className="font-bold">{totals.totalMembers}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-600">Applications</div>
                <div className="font-bold">{totals.totalApps}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-600">Accepted</div>
                <div className="font-bold text-green-600">{totals.accepted}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-600">Declined</div>
                <div className="font-bold text-red-600">{totals.declined}</div>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => {
                  // quick open a random club
                  if (clubs.length) {
                    const r = clubs[Math.floor(Math.random() * clubs.length)];
                    setSelectedClubId(r.id);
                    setActiveTab("members");
                  }
                }}
                className="w-full py-2 rounded-lg text-sm font-bold"
                style={{ background: COLORS.black, color: COLORS.lightApricot }}
              >
                Surprise me
              </button>
            </div>

            <div className="mt-4 text-xs text-gray-500">Palette: <span style={{ color: COLORS.brownDeep }}>brown</span>, <span style={{ color: COLORS.orange }}>orange</span>, <span style={{ color: COLORS.lightApricot }}>apricot</span></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
