
// src/applicants/applicantsRoutes.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import Dashboard from "../applicants/components/dashboard";
import ProfileRoutes from "./pages/profile";
import Nav from "./Nav";

function ApplicantsLayout() {
  return (
    // layout background stays full-bleed; nav is fixed so main needs left margin
    <div
      className="min-h-screen"
      style={{
        // cute soft green background with subtle blobs
        background:
          "radial-gradient(circle at 10% 20%, rgba(127,168,52,0.06), transparent 10%)," +
          "radial-gradient(circle at 90% 80%, rgba(86,131,25,0.05), transparent 12%)," +
          "#F6FBF6",
      }}
    >
      {/* Nav is a fixed left sidebar (Nav.jsx provides fixed positioning).
          Main content must be offset so it doesn't sit under the fixed nav. */}
      <Nav />

      {/* main content area sits to the right of the fixed 64px-wide sidebar.
          Use ml-64 to offset; the area scrolls while Nav stays fixed. */}
      <main className="ml-64 min-h-screen p-6">
        <Outlet />
      </main>
    </div>
  );
}

/**
 * Wallet (IR Tokens) — UI-first, cute design.
 * - search, create, reveal/copy/revoke
 * - no extra dashboard nav added here (layout provides Nav)
 *
 * Wire actual API calls where indicated.
 */
function Wallet() {
  const [tokens, setTokens] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    // load tokens (replace with your API)
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        // TODO: replace with actual fetch from your backend
        const placeholder = [
          { id: "t_1", name: "Default client", token: "sk_live_5H6x...a1B3", created_at: "2025-09-20" },
          { id: "t_2", name: "Mobile app", token: "sk_live_2Jkz...q9Y2", created_at: "2025-09-26" },
          { id: "t_3", name: "CI pipeline", token: "sk_live_7LmN...z4K7", created_at: "2025-10-01" },
        ];
        if (!mounted) return;
        setTokens(placeholder.map(t => ({ ...t, revealed: false })));
      } catch (err) {
        console.error("load tokens err", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tokens;
    return tokens.filter(
      t => (t.name || "").toLowerCase().includes(q) || (t.id || "").toLowerCase().includes(q)
    );
  }, [tokens, query]);

  async function handleCreate() {
    const name = window.prompt("Name this token (e.g. 'CI pipeline'):");
    if (!name) return;
    setCreating(true);
    try {
      // TODO: POST to your API and return real token
      const id = `t_${Math.random().toString(36).slice(2, 9)}`;
      const token = `sk_live_${Math.random().toString(36).slice(2, 18)}`;
      const created_at = new Date().toISOString().slice(0, 10);
      const newToken = { id, name, token, created_at, revealed: true };
      setTokens(prev => [newToken, ...prev]);
      await navigator.clipboard?.writeText(token).catch(() => null);
      alert("Token created and copied to clipboard — store it safely. It will not be shown again.");
    } catch (err) {
      console.error("create token err", err);
      alert("Could not create token");
    } finally {
      setCreating(false);
    }
  }

  function toggleReveal(id) {
    setTokens(prev => prev.map(t => (t.id === id ? { ...t, revealed: !t.revealed } : t)));
  }

  async function handleCopy(id) {
    const t = tokens.find(x => x.id === id);
    if (!t) return;
    try {
      await navigator.clipboard.writeText(t.token);
      const el = document.getElementById(`copied-${id}`);
      if (el) {
        el.innerText = "Copied!";
        setTimeout(() => {
          if (el) el.innerText = "";
        }, 1200);
      }
    } catch (err) {
      console.error("copy failed", err);
      alert("Copy failed");
    }
  }

  async function handleRevoke(id) {
    if (!window.confirm("Revoke this token? This cannot be undone.")) return;
    try {
      // TODO: call DELETE /api/applicant/tokens/:id
      setTokens(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error("revoke err", err);
      alert("Could not revoke token");
    }
  }

  return (
    // no ml-64 here because the layout already offsets the main content
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#0B1F11" }}>
            IR Tokens
          </h1>
          <p className="text-sm" style={{ color: "#536352" }}>
            Your API tokens — create, copy, or revoke. Treat tokens like passwords.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            placeholder="Search tokens by name or id"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="px-3 py-2 rounded-lg border"
            style={{
              width: 260,
              borderColor: "#56831933",
              background: "white",
            }}
          />

          <button
            onClick={handleCreate}
            className="px-4 py-2 rounded-lg font-semibold shadow"
            style={{
              background: "linear-gradient(90deg,#7FA834,#568319)",
              color: "#072012",
            }}
            disabled={creating}
          >
            {creating ? "Creating..." : "Create token"}
          </button>
        </div>
      </div>

      {/* cute container */}
      <div
        className="rounded-2xl p-4"
        style={{
          border: "1px solid rgba(86,131,25,0.12)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.8), rgba(245,255,240,0.8))",
          boxShadow: "0 8px 30px rgba(87,131,25,0.04)",
        }}
      >
        {loading ? (
          <div className="py-16 text-center text-slate-500">Loading tokens…</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <div style={{ fontSize: 48, lineHeight: 1 }}>🌿</div>
            <div className="mt-3">No tokens yet.</div>
            <div className="mt-2 text-sm text-slate-500">Click <strong>Create token</strong> to make your first one.</div>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map(token => (
              <li
                key={token.id}
                className="flex items-center justify-between p-4 rounded-xl"
                style={{
                  background: "linear-gradient(90deg, rgba(255,255,255,0.9), rgba(245,255,240,0.9))",
                  border: "1px solid rgba(234,246,234,0.8)",
                  boxShadow: "0 6px 18px rgba(22,40,12,0.04)",
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-14 h-14 rounded-lg flex items-center justify-center"
                    style={{
                      background: "radial-gradient(circle at 30% 20%, #FFFFFF, #F5FFF5)",
                      border: "1px solid rgba(86,131,25,0.08)",
                      boxShadow: "inset 0 -6px 12px rgba(86,131,25,0.03)",
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#568319" strokeWidth="1.5">
                      <rect x="3" y="7" width="18" height="10" rx="2" />
                      <path d="M12 3v4" />
                      <path d="M12 17v4" />
                    </svg>
                  </div>

                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0B1F11" }}>{token.name}</div>
                    <div style={{ fontSize: 12, color: "#6B7280" }}>Created {token.created_at} • id: {token.id}</div>

                    <div className="mt-3" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          padding: "6px 10px",
                          borderRadius: 10,
                          background: "#FBFFFB",
                          border: "1px solid #EAF6EA",
                          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
                          fontSize: 13,
                          color: "#0B1F11",
                          maxWidth: 420,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {token.revealed ? token.token : maskToken(token.token)}
                      </div>

                      {token.revealed && (
                        <div style={{ fontSize: 12, color: "#16A34A", fontWeight: 600 }}>Visible</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleReveal(token.id)}
                    className="px-3 py-1 rounded-md text-sm border"
                    style={{ borderColor: "#56831933", background: "transparent", color: "#072012" }}
                  >
                    {token.revealed ? "Hide" : "Reveal"}
                  </button>

                  <button
                    onClick={() => handleCopy(token.id)}
                    className="px-3 py-1 rounded-md text-sm"
                    style={{ border: "1px solid #EAEAEA", background: "transparent" }}
                  >
                    Copy
                  </button>

                  <button
                    onClick={() => handleRevoke(token.id)}
                    className="px-3 py-1 rounded-md text-sm"
                    style={{ border: "1px solid #F2D7D9", background: "#FFF5F6", color: "#7F1D1D" }}
                  >
                    Revoke
                  </button>

                  <div id={`copied-${token.id}`} style={{ minWidth: 56, textAlign: "right", color: "#16A34A", fontSize: 13 }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 text-right text-sm" style={{ color: "#51614F" }}>
        <span>Tokens are shown once when created. Keep them safe 🌱</span>
      </div>
    </div>
  );
}

/* small util used above */
function maskToken(t = "") {
  if (!t) return "—";
  if (t.length <= 10) return "••••••••";
  const start = t.slice(0, 6);
  const end = t.slice(-4);
  return `${start}…${end}`;
}

export default function ApplicantsRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ApplicantsLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="profile/*" element={<ProfileRoutes />} />
        <Route path="wallet" element={<Wallet />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
    </Routes>
  );
}

