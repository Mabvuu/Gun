// src/applicants/components/dashboard.jsx
import React, { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

const COLORS = {
  primaryLight: "#7FA834",
  primary: "#568319",
  deepGreen: "#194118",
  magenta: "#8C1B6D",
  pink: "#D02893",
  surface: "#F6FBF6",
  card: "#FFFFFF",
  textDark: "#0B1F11",
  mutedText: "#6B7280",
  border: "#E6EAEA",
};

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const local = (() => {
      try {
        const raw = localStorage.getItem("applicant_profile");
        return raw ? JSON.parse(raw) : null;
      } catch (err) {
        console.error("localStorage parse error:", err);
        return null;
      }
    })();

    if (local) {
      setProfile(local);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/profile`);
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const d = await res.json();
        if (mounted) {
          setProfile(d);
          try {
            localStorage.setItem("applicant_profile", JSON.stringify(d));
          } catch (storageErr) {
            console.error("localStorage set error:", storageErr);
          }
        }
      } catch (fetchErr) {
        console.error("profile fetch error:", fetchErr);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div style={{ maxWidth: 900, margin: "32px auto", padding: 20 }}>
        <div style={{ height: 16, width: 220, background: "#eee", borderRadius: 8, marginBottom: 12 }} />
        <div style={{ height: 260, background: "#fafafa", borderRadius: 12 }} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ maxWidth: 900, margin: "32px auto", padding: 20, background: COLORS.surface, borderRadius: 12 }}>
        <h2 style={{ margin: 0, color: COLORS.textDark }}>Applicant dashboard</h2>
        <p style={{ color: COLORS.mutedText }}>No profile available. Create a profile to see details here.</p>
        <div style={{ marginTop: 12 }}>
          <a href="/applicants/profile" style={{ textDecoration: "none" }}>
            <button
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                background: `linear-gradient(90deg, ${COLORS.primaryLight}, ${COLORS.primary})`,
                color: COLORS.card,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Create profile
            </button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 980, margin: "28px auto", padding: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: 18,
          borderRadius: 12,
          background: `linear-gradient(90deg, ${COLORS.primaryLight}, ${COLORS.primary})`,
          color: COLORS.textDark,
          boxShadow: "0 10px 30px rgba(87,131,25,0.06)",
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Applicant dashboard</div>
          <div style={{ fontSize: 13, color: "rgba(11,31,17,0.9)" }}>Welcome back</div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "rgba(11,31,17,0.85)" }}>Signed in as</div>
          <div style={{ fontSize: 14, fontWeight: 800 }}>{profile.email || "—"}</div>
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "160px 1fr",
          gap: 18,
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 12,
          padding: 18,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          {profile.photo_url ? (
            <img
              src={profile.photo_url}
              alt="profile"
              style={{ width: 160, height: 160, objectFit: "cover", borderRadius: 12, boxShadow: "0 8px 20px rgba(9,15,10,0.06)" }}
            />
          ) : (
            <div
              style={{
                width: 160,
                height: 160,
                borderRadius: 12,
                background: `linear-gradient(180deg, ${COLORS.primaryLight}, ${COLORS.primary})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              No photo
            </div>
          )}

          <div style={{ width: "100%", textAlign: "center" }}>
            <div style={{ fontWeight: 700, color: COLORS.textDark }}>{profile.full_name || "No name"}</div>
            <div style={{ fontSize: 13, color: COLORS.mutedText }}>{profile.id_number || "No ID"}</div>
          </div>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <InfoRow label="Province" value={profile.province} />
              <InfoRow label="City" value={profile.city} />
              <InfoRow label="Club" value={profile.shooting_club} />
            </div>

            <div style={{ width: 220 }}>
              <InfoRow label="Phone" value={profile.phone} />
              <InfoRow label="Email" value={profile.email} />
              <InfoRow label="Profile created" value={profile.created_at ? new Date(profile.created_at).toLocaleString() : null} />
            </div>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            <a href="/applicants/profile" style={{ textDecoration: "none" }}>
              <button
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(5,75,10,0.06)",
                  background: "transparent",
                  color: COLORS.textDark,
                  cursor: "pointer",
                }}
              >
                Edit profile
              </button>
            </a>

            <button
              onClick={() => {
                try {
                  localStorage.removeItem("applicant_profile");
                  window.location.reload();
                } catch (err) {
                  console.error("refresh error:", err);
                }
              }}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "none",
                background: `linear-gradient(90deg, ${COLORS.magenta}, ${COLORS.pink})`,
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderBottom: "1px solid #F0F4F2", alignItems: "center" }}>
      <div style={{ color: "#6B7280", fontSize: 13 }}>{label}</div>
      <div style={{ fontWeight: 700, color: "#0B1F11", fontSize: 13 }}>{String(value)}</div>
    </div>
  );
}
