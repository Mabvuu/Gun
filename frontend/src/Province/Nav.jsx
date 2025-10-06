// src/Province/Nav.jsx
import React, { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

// import the .glb file
import modelPath from "../assets/1.glb";

const COLORS = {
  licorice: "#1E0D0A",
  rosewood: "#550006",
  mahogany: "#BF353B",
  froly: "#EE666A",
  deepMoss: "#3D4421",
};

const LINKS = [
  { to: "/province/dashboard", label: "Dashboard" },
  { to: "/province/receive", label: "Receive" },
  { to: "/province/reports", label: "Reports" },
  { to: "/province/audit", label: "Audit" },
  { to: "/province/notifications", label: "Notifications" },
];

export default function Nav() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null); // for sizing decisions
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.z = 2.2;

    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambient);

    const loader = new GLTFLoader();
    let model = null;
    loader.load(
      modelPath,
      (gltf) => {
        model = gltf.scene;
        model.rotation.y = Math.PI / 4;
        scene.add(model);
      },
      undefined,
      (err) => {
        console.warn("GLB load error", err);
      }
    );

    const clock = new THREE.Clock();
    let rafId = null;

    function resize() {
      if (!canvas) return;
      const size = Math.min(96, Math.max(64, Math.floor((containerRef.current?.clientWidth || 256) * 0.18)));
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      renderer.setSize(size, size, false);
      camera.aspect = 1;
      camera.updateProjectionMatrix();
    }

    // initial resize
    resize();
    const ro = new ResizeObserver(resize);
    if (containerRef.current) ro.observe(containerRef.current);

    function animate() {
      const dt = clock.getDelta();
      if (model) model.rotation.y += dt * 0.6;
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    }
    animate();

    // cleanup
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      ro.disconnect();
      renderer.dispose();
      scene.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose && m.dispose());
          } else {
            child.material.dispose && child.material.dispose();
          }
        }
      });
    };
  }, []);

  // functional logout: clears common tokens and navigates to /login
  const handleLogout = async () => {
    try {
      const keys = ["access_token", "supabase.auth.token", "sb:token", "token"];
      keys.forEach((k) => localStorage.removeItem(k));

      // optional server logout (doesn't block navigation if it fails)
      try {
        await fetch("/api/logout", { method: "POST", credentials: "include" });
      } catch  {
        // ignore server errors
      }

      navigate("/", { replace: true });
    } catch (err) {
      console.error("Logout error", err);
      navigate("/", { replace: true });
    }
  };

  return (
    // fixed left sidebar: will not move on scroll
    <aside
      ref={containerRef}
      className="fixed top-0 left-0 h-screen w-64 p-5 text-white flex flex-col"
      style={{
        background: `linear-gradient(180deg, ${COLORS.licorice}, ${COLORS.deepMoss})`,
      }}
      aria-label="Province navigation"
    >
      {/* Logo + GLB */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="rounded-lg shadow-lg overflow-hidden flex items-center justify-center"
          style={{
            width: 64,
            height: 64,
            background: `linear-gradient(135deg, ${COLORS.rosewood}, ${COLORS.mahogany})`,
          }}
        >
          {/* actual canvas used by Three.js */}
          <canvas ref={canvasRef} className="block" width={64} height={64} />
        </div>

        <div>
          <h3 className="text-lg font-bold" style={{ color: COLORS.froly }}>
            Province
          </h3>
          <p className="text-xs text-gray-300">Control Panel</p>
        </div>
      </div>

      {/* Links */}
      <nav className="relative flex flex-col gap-2 flex-grow">
        {/* indicator: moves with activeIndex */}
        <div
          className="absolute left-0 w-1 h-10 rounded-r bg-gradient-to-b from-[#EE666A] to-[#BF353B] transition-transform duration-300"
          style={{ transform: `translateY(${activeIndex * 48}px)` }}
        />
        {LINKS.map((l, i) => (
          <NavLink
            key={l.to}
            to={l.to}
            onClick={() => setActiveIndex(i)}
            className={({ isActive }) =>
              `relative flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                isActive ? "text-[#EE666A] bg-white/5" : "text-gray-200 hover:text-white hover:bg-white/5"
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="mt-6 w-full py-2 rounded-lg font-semibold transition-colors bg-[#BF353B] hover:bg-[#EE666A] text-white shadow-md"
        type="button"
      >
        Logout
      </button>
    </aside>
  );
}
