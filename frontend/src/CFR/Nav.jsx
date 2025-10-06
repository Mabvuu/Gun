

// src/CFR/Nav.jsx
import React, { Suspense } from "react";
import { NavLink } from "react-router-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls, Html } from "@react-three/drei";
import modelUrl from "../assets/1.glb"; // adjust path if necessary

const PALETTE = {
  darkBrown: "#6A2B09",
  orange: "#C5620B",
  lightApricot: "#FCB861",
  slate: "#6F7781",
  black: "#040404",
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(e) {
    console.error("3D model error:", e);
  }
  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}

function RotatingModel({ src = modelUrl, speed = 0.6 }) {
  const gltf = useGLTF(src, true);
  const scene = gltf?.scene || (gltf?.scenes && gltf.scenes[0]) || null;

  if (scene) {
    scene.scale.set(0.8, 0.8, 0.8);
    scene.position.set(0, -0.25, 0);
  }

  useFrame(({ clock }) => {
    if (!scene) return;
    const t = clock.getElapsedTime();
    scene.rotation.y = t * speed;
    scene.rotation.x = Math.sin(t * 0.6) * 0.05;
    scene.position.y = -0.25 + Math.sin(t * 0.8) * 0.02;
  });

  if (!scene) return null;
  return <primitive object={scene} dispose={null} />;
}

export default function CFRNav({ className = "" }) {
  const linkBase =
    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors";

  return (
    <aside
      aria-label="CFR navigation"
      className={`fixed left-0 top-0 bottom-0 w-64 p-4 flex flex-col justify-between ${className}`}
      style={{
        background: `linear-gradient(180deg, ${PALETTE.orange} 0%, ${PALETTE.darkBrown} 100%)`,
        zIndex: 50,
      }}
    >
      <div>
        <div className="w-full h-36 mb-4 rounded-md overflow-hidden bg-white/5 flex items-center justify-center">
          <Canvas camera={{ position: [0, 0, 2.5], fov: 45 }}>
            <ambientLight intensity={0.8} />
            <directionalLight position={[5, 5, 5]} intensity={0.6} />
            <ErrorBoundary fallback={<Html><div style={{ width: 160, height: 160 }} /></Html>}>
              <Suspense fallback={<Html><div style={{ width: 160, height: 160 }} /></Html>}>
                <RotatingModel src={modelUrl} speed={0.6} />
              </Suspense>
            </ErrorBoundary>
            <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} />
          </Canvas>
        </div>

        <div className="mb-3 text-white">
          <div className="text-lg font-semibold">CFR</div>
          <div className="text-xs opacity-90">Control & Forensics</div>
        </div>

        <nav className="space-y-2">
          <NavLink
            to="/cfr/applicants"
            className={({ isActive }) => `${linkBase} ${isActive ? "text-white bg-[rgba(255,255,255,0.06)]" : "text-white/90 hover:opacity-95"}`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 13h8V3H3v10zM13 21h8V11h-8v10zM13 3v8h8V3h-8zM3 21h8v-8H3v8z" />
            </svg>
            <span>Applicants</span>
          </NavLink>

          <NavLink
            to="/cfr/police"
            className={({ isActive }) => `${linkBase} ${isActive ? "text-white bg-[rgba(255,255,255,0.06)]" : "text-white/90 hover:opacity-95"}`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l4 4-4 4-4-4 4-4z" />
            </svg>
            <span>Police</span>
          </NavLink>

          <NavLink
            to="/cfr/province"
            className={({ isActive }) => `${linkBase} ${isActive ? "text-white bg-[rgba(255,255,255,0.06)]" : "text-white/90 hover:opacity-95"}`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10V7a2 2 0 0 0-2-2h-6" />
              <path d="M3 21v-6a2 2 0 0 1 2-2h6" />
            </svg>
            <span>Province</span>
          </NavLink>

          <NavLink
            to="/cfr/int"
            className={({ isActive }) => `${linkBase} ${isActive ? "text-white bg-[rgba(255,255,255,0.06)]" : "text-white/90 hover:opacity-95"}`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20" />
              <path d="M2 12h20" />
            </svg>
            <span>INT</span>
          </NavLink>

          <NavLink
            to="/cfr/moj"
            className={({ isActive }) => `${linkBase} ${isActive ? "text-white bg-[rgba(255,255,255,0.06)]" : "text-white/90 hover:opacity-95"}`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a7.7 7.7 0 0 0 0-6" />
            </svg>
            <span>MOJ</span>
          </NavLink>

          <NavLink
            to="/cfr/clubs"
            className={({ isActive }) => `${linkBase} ${isActive ? "text-white bg-[rgba(255,255,255,0.06)]" : "text-white/90 hover:opacity-95"}`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" />
            </svg>
            <span>Clubs</span>
          </NavLink>
        </nav>
      </div>

      <div className="mt-6">
        <button
          type="button"
          className="w-full py-2 rounded-md font-semibold shadow-sm"
          style={{
            background: `linear-gradient(90deg, ${PALETTE.lightApricot}, ${PALETTE.black})`,
            color: "#fff",
          }}
          onClick={() => {
            const ev = new CustomEvent("cfr-logout");
            window.dispatchEvent(ev);
          }}
        >
          Logout
        </button>
      </div>
    </aside>
  );
}

