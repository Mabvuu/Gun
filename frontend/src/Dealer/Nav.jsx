// src/Dealer/Nav.jsx
import React, { useEffect, useState, Suspense, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supebaseClient";

// react-three-fiber
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls, Html } from "@react-three/drei";

// model import
import modelUrl from "../assets/1.glb";

const NAV_WIDTH_OPEN = 256; 
const NAV_WIDTH_CLOSED = 72; 
const LOGO_SIZE = 48;

function RotatingModel({ src = modelUrl }) {
  const gltf = useGLTF(src, true);
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.35;
  });
  return <primitive ref={ref} object={gltf.scene} scale={[0.85, 0.85, 0.85]} />;
}

export default function DealerNav() {
  const [open, setOpen] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { name: "Dashboard", path: "/dealer/dashboard" },
    { name: "Mint Gun", path: "/dealer/mint" },
    { name: "Sales Queue", path: "/dealer/sales" },
    { name: "Transfers", path: "/dealer/transfers" },
    { name: "Audit", path: "/dealer/audit" },
    { name: "Notifications", path: "/dealer/notifications" },
  ];

  const palette = {
    black: "#000000",
    deepBlue: "#025067",
    teal: "#0B9FBD",
    plum: "#6C0E42",
    magenta: "#B31B6F",
  };

  const sidebarGradient = `linear-gradient(180deg, ${palette.teal} 0%, ${palette.plum} 100%)`;
  const asideWidth = open ? NAV_WIDTH_OPEN : NAV_WIDTH_CLOSED;

  useEffect(() => {
    let mounted = true;
    async function fetchUserEmail() {
      try {
        const { data } = await supabase.auth.getUser();
        const email = data?.user?.email;
        if (mounted && email) setUserEmail(email);
      } catch {
        const saved = localStorage.getItem("email") || sessionStorage.getItem("email");
        if (mounted && saved) setUserEmail(saved);
      }
    }
    fetchUserEmail();

    const subscription = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email || "";
      setUserEmail(email);
    });

    return () => {
      mounted = false;
      if (subscription?.data?.subscription?.unsubscribe) {
        subscription.data.subscription.unsubscribe();
      } else if (typeof subscription?.unsubscribe === "function") {
        subscription.unsubscribe();
      }
    };
  }, []);

  async function handleLogout() {
    try {
      if (supabase?.auth?.signOut) {
        await supabase.auth.signOut();
      } else {
        localStorage.removeItem("token");
        sessionStorage.removeItem("auth");
      }
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      navigate("/");
    }
  }

  return (
    <>
      <aside
        aria-label="Dealer navigation"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          width: asideWidth,
          padding: 16,
          background: sidebarGradient,
          color: "#fff",
          overflowY: "auto",
          boxShadow: "0 12px 30px rgba(2,6,23,0.45)",
          transition: "width 180ms ease",
          zIndex: 50,
        }}
      >
        <style>{`
          .r3f-canvas { width: ${LOGO_SIZE}px; height: ${LOGO_SIZE}px; border-radius: 12px; display:block; }
          .rotor-fallback-img { width: ${LOGO_SIZE}px; height: ${LOGO_SIZE}px; object-fit: cover; border-radius: 8px; display:block; }
          .nav-link:hover { background: rgba(255,255,255,0.04); }
        `}</style>

        {/* Toggle sidebar */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle sidebar"
            style={{
              position: "absolute",
              right: 12,
              top: 0,
              transform: "translateY(-6px)",
              background: "rgba(255,255,255,0.08)",
              padding: 8,
              borderRadius: 9999,
              border: "none",
              color: "#fff",
              cursor: "pointer",
              zIndex: 60,
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {open ? "←" : "→"}
          </button>
        </div>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div
            title="Logo"
            style={{
              width: LOGO_SIZE,
              height: LOGO_SIZE,
              borderRadius: 12,
              overflow: "hidden",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.12)",
              boxShadow: "0 6px 18px rgba(2,6,23,0.35)",
              flexShrink: 0,
            }}
          >
            <div style={{ position: "relative", width: LOGO_SIZE, height: LOGO_SIZE }}>
              <Canvas className="r3f-canvas" orthographic camera={{ position: [0, 0, 5], zoom: 90 }}>
                <ambientLight intensity={0.9} />
                <directionalLight position={[5, 5, 5]} intensity={0.6} />
                <Suspense fallback={<Html><div style={{ width: LOGO_SIZE, height: LOGO_SIZE }} /></Html>}>
                  <RotatingModel src={modelUrl} />
                </Suspense>
                <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
              </Canvas>

              <img
                src="/images/Rainy-Day-Palette.jpg"
                alt="fallback"
                className="rotor-fallback-img"
                style={{ position: "absolute", top: 0, left: 0 }}
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            </div>
          </div>
          {open && (
            <div style={{ color: "rgba(255,255,255,0.95)", fontWeight: 700, fontSize: 18 }}>Dealer</div>
          )}
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "12px 0" }} />

        {/* Menu */}
        <nav aria-label="Primary">
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className="nav-link"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    borderRadius: 8,
                    color: "white",
                    textDecoration: "none",
                    fontWeight: location.pathname === item.path ? 800 : 600,
                    background: location.pathname === item.path
                      ? "linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))"
                      : "transparent",
                    overflow: "hidden",
                  }}
                >
                  <span style={{ display: "inline-block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: asideWidth - 120 }}>
                    {open ? item.name : item.name.charAt(0)}
                  </span>
                  <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                    <span style={{ width: 10, height: 10, borderRadius: 9999, background: palette.deepBlue }} />
                    <span style={{ width: 10, height: 10, borderRadius: 9999, background: palette.magenta }} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div style={{ height: 12 }} />

        {/* Account + logout */}
        <div style={{ marginTop: "auto" }}>
          <div style={{
            background: "rgba(255,255,255,0.04)",
            color: "rgba(255,255,255,0.95)",
            padding: "10px 12px",
            borderRadius: 8,
            fontSize: 12,
            wordBreak: "break-word",
          }}>
            {open ? (
              <>
                <div style={{ fontWeight: 700 }}>Dealer</div>
                <div style={{ color: "rgba(255,255,255,0.8)", marginTop: 4, fontSize: 11 }}>{userEmail || "not signed in"}</div>
              </>
            ) : (
              <div style={{ textAlign: "center", fontSize: 14 }}>D</div>
            )}
          </div>

          <button
            onClick={handleLogout}
            aria-label="Logout"
            style={{
              marginTop: 10,
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              background: palette.magenta,
              color: "#fff",
              border: "none",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {open ? "Logout" : "⎋"}
          </button>
        </div>
      </aside>

      {/* Spacer */}
      <div style={{ width: asideWidth, flexShrink: 0 }} />

      <main style={{ minHeight: "100vh", minWidth: 0, overflowX: "hidden" }} />
    </>
  );
}
