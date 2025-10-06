// frontend/src/pages/Login.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supebaseClient";

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import modelUrl from "../assets/2.glb?url";

// ===== CONFIG =====
// pick: 'A' (left vertical CFR + model+controls), 'B' (card grid), 'C' (compact split)
const VARIANT = "A";

const ROLES = ["cfr", "applicants", "dealer", "police", "province", "club", "intel", "moj"];

function roleToRoute(role) {
  if (!role) return "/";
  const r = role.toLowerCase();
  const map = {
    applicants: "/applicant/dashboard",
    applicant: "/applicant/dashboard",
    dealers: "/dealer/dashboard",
    dealer: "/dealer/dashboard",
    police: "/police/dashboard",
    province: "/province/dashboard",
    club: "/club/dashboard",
    intel: "/int/Dashboard",
    moj: "/moj/dashboard",
    cfr: "/cfr/dashboard",
  };
  return map[r] || `/${r}/dashboard`;
}

// keep removing model on auth to avoid weirdness
const REMOVE_ON_AUTH = true;

export default function Login({ onLogin }) {
  const [step, setStep] = useState("pick"); // 'pick' | 'auth'
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [modelError, setModelError] = useState("");

  const navigate = useNavigate();

  // Layout constants
  const MAX_LEFT_WIDTH = 780;
  const RIGHT_WIDTH = 360;
  const DESIRED_ASPECT = 520 / 360;

  // three refs
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const mixerRef = useRef(null);
  const requestRef = useRef(null);
  const modelRef = useRef(null);
  const targetRotRef = useRef({ x: 0, y: 0 });

  async function handleAuth(e) {
    e?.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      if (!data?.user) throw new Error("No user returned.");

      const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", data.user.id).maybeSingle();

      if (onLogin) onLogin({ user: data.user, profile });

      navigate(roleToRoute(role), { replace: true });
    } catch (authErr) {
      console.error(authErr);
      setErr(authErr.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const teardownThree = () => {
    try {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    } catch (e) {
      console.warn("cancelAnimationFrame error:", e);
    }
    requestRef.current = null;

    try {
      if (rendererRef.current?.domElement) {
        const el = rendererRef.current.domElement;
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }
    } catch (teardownErr) {
      console.warn("teardown DOM removal:", teardownErr);
    }

    try {
      if (modelRef.current) {
        modelRef.current.traverse((obj) => {
          if (obj.isMesh) {
            obj.geometry?.dispose();
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
            else obj.material?.dispose();
          }
        });
      }
    } catch (disposeErr) {
      console.warn("dispose error:", disposeErr);
    }

    try {
      controlsRef.current?.dispose();
    } catch (ctlErr) {
      console.warn("controls dispose err:", ctlErr);
    }

    try {
      rendererRef.current?.dispose();
    } catch (rendErr) {
      console.warn("renderer dispose err:", rendErr);
    }

    rendererRef.current = null;
    controlsRef.current = null;
    mixerRef.current = null;
    modelRef.current = null;
  };

  // Three.js init (only on 'pick' step)
  useEffect(() => {
    if (step !== "pick") {
      if (REMOVE_ON_AUTH) {
        teardownThree();
        if (mountRef.current) mountRef.current.style.display = "none";
      }
      return;
    }

    if (mountRef.current) {
      mountRef.current.style.display = "";
      mountRef.current.style.opacity = "";
      mountRef.current.style.pointerEvents = "";
      mountRef.current.style.position = "";
    }

    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 200);
    camera.position.set(0, 0.6, 2.5);

    const key = new THREE.DirectionalLight(0xffe7d8, 1.0);
    key.position.set(2.5, 3, 2.5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffd6b3, 0.45);
    rim.position.set(-2, 1, -2);
    scene.add(rim);
    const ambient = new THREE.HemisphereLight(0xfff4ee, 0x2b1307, 0.4);
    scene.add(ambient);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 0.45;
    controls.maxDistance = 6;
    controlsRef.current = controls;

    const loader = new GLTFLoader();
    setModelError("");
    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene || gltf.scenes?.[0];
        if (!model) {
          setModelError("Model loaded but no scene found.");
          return;
        }

        model.traverse((c) => {
          if (c.isMesh && c.material && !Array.isArray(c.material)) {
            if ("metalness" in c.material) c.material.metalness = Math.min(1, (c.material.metalness ?? 0) + 0.12);
            if ("roughness" in c.material) c.material.roughness = Math.max(0, (c.material.roughness ?? 0) - 0.06);
          }
        });

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const fitScale = 1.0 / maxDim;
        model.scale.setScalar(fitScale * 1.3);

        const box2 = new THREE.Box3().setFromObject(model);
        const center2 = box2.getCenter(new THREE.Vector3());
        model.position.sub(center2);

        const bottomY = box2.min.y;
        model.position.y += Math.abs(bottomY) * 0.02 + 0.02;

        const boundingSphere = box2.getBoundingSphere(new THREE.Sphere());
        const radius = boundingSphere.radius || Math.max(size.x, size.y, size.z) / 2;
        camera.position.set(0, radius * 0.35 + 0.25, radius * 2.1 + 0.5);
        controls.target.set(0, radius * 0.08, 0);
        controls.update();

        model.userData.baseScale = model.scale.x;
        scene.add(model);
        modelRef.current = model;

        if (gltf.animations?.length) {
          const mixer = new THREE.AnimationMixer(model);
          gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
          mixerRef.current = mixer;
        }
      },
      undefined,
      (loadErr) => {
        console.warn("GLTFLoader error:", loadErr);
        setModelError("Error loading model (check console/network).");
      }
    );

    function doResize() {
      const containerRect = mount.parentElement?.getBoundingClientRect() || { width: Math.min(window.innerWidth, MAX_LEFT_WIDTH) };
      const leftAvailable = Math.min(containerRect.width, MAX_LEFT_WIDTH);
      const viewportCap = Math.floor(window.innerHeight * 0.62);
      const heightFromAspect = Math.round(leftAvailable / DESIRED_ASPECT);
      const h = Math.max(140, Math.min(viewportCap, heightFromAspect));
      const w = Math.max(220, Math.min(leftAvailable, Math.round(h * DESIRED_ASPECT)));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    window.addEventListener("resize", doResize);
    doResize();

    const onPointerMove = (ev) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const nx = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotRef.current.y = nx * 0.55;
      targetRotRef.current.x = ny * 0.32;
    };
    window.addEventListener("mousemove", onPointerMove);

    const onPointerDown = () => {
      if (!modelRef.current) return;
      const base = modelRef.current.userData.baseScale ?? modelRef.current.scale.x;
      modelRef.current.scale.setScalar(base * 0.96);
      setTimeout(() => {
        if (modelRef.current) modelRef.current.scale.setScalar(base);
      }, 120);
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);

    const clock = new THREE.Clock();
    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const time = clock.getElapsedTime();

      if (mixerRef.current) mixerRef.current.update(dt);

      const model = modelRef.current;
      if (model) {
        const bobY = Math.sin(time * 1.05) * 0.02;
        const bobRot = Math.sin(time * 0.85) * 0.01;

        model.rotation.x = THREE.MathUtils.lerp(model.rotation.x, targetRotRef.current.x + bobRot, 0.09);
        model.rotation.y = THREE.MathUtils.lerp(model.rotation.y, targetRotRef.current.y, 0.06);
        model.rotation.z = THREE.MathUtils.lerp(model.rotation.z, Math.sin(time * 0.7) * 0.02, 0.02);

        model.position.y = THREE.MathUtils.lerp(model.position.y, bobY + 0.03, 0.06);

        const base = model.userData.baseScale ?? model.scale.x;
        const pulse = 1 + Math.sin(time * 1.9) * 0.006;
        model.scale.setScalar(base * pulse);
      }

      if (controlsRef.current) controlsRef.current.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener("resize", doResize);
      window.removeEventListener("mousemove", onPointerMove);
      try {
        if (rendererRef.current?.domElement) rendererRef.current.domElement.removeEventListener("pointerdown", onPointerDown);
      } catch (remErr) {
        console.warn("remove pointerdown err:", remErr);
      }
      teardownThree();
    };
    // note: intentionally no eslint-disable lines here
  }, [DESIRED_ASPECT, MAX_LEFT_WIDTH, step]);

  // Small helpers for UI styles (keeps consistent look)
  const baseBg = "#3E1F10";
  const panelGradient = "linear-gradient(180deg, rgba(60,28,15,0.95), rgba(46,20,12,0.95))";
  const accentGradient = "linear-gradient(90deg,#F09410,#BC430D)";

  // Common CSS (hover, transitions)
  const commonStyles = `
    .role-btn, .role-card, .cfr-btn, .submit-btn, .nav-btn {
      transition: transform 160ms ease, box-shadow 160ms ease, filter 160ms ease;
      will-change: transform, box-shadow, filter;
    }
    .role-btn:hover, .role-card:hover, .cfr-btn:hover, .submit-btn:hover {
      transform: translateY(-4px) scale(1.02);
      box-shadow: 0 8px 28px rgba(0,0,0,0.45);
      filter: brightness(1.06);
    }
    .role-card { border-radius: 10px; cursor: pointer; }
    .cfr-btn { border-radius: 10px; cursor: pointer; }
    .submit-btn { border-radius: 8px; cursor: pointer; }
    .role-card:active, .cfr-btn:active, .role-btn:active, .submit-btn:active { transform: translateY(-1px) scale(0.995); }
    .small-link { color: #F0D0C7; text-decoration: underline; background: transparent; border: none; cursor: pointer; }
    .muted { color: #CFAF9F; font-size: 13px; }
    /* make the model preview slightly lift on hover for polish */
    .model-wrap { transition: transform 220ms ease, box-shadow 220ms ease; border-radius: 8px; overflow: hidden; }
    .model-wrap:hover { transform: translateY(-6px); box-shadow: 0 18px 60px rgba(0,0,0,0.6); }
  `;

  // Render variants
  if (step === "pick") {
    if (VARIANT === "A") {
      // Left vertical CFR + model + role column on right
      return (
        <>
          <style>{commonStyles}</style>
          <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "stretch", justifyContent: "center", background: baseBg, padding: 18 }}>
            <div style={{ width: "100%", maxWidth: 1200, display: "grid", gridTemplateColumns: "120px 1fr 360px", gap: 20, alignItems: "start" }}>
              {/* LEFT: Vertical CFR */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
                <div style={{ width: 100, height: 100, borderRadius: 12, background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 0 20px rgba(0,0,0,0.4)" }}>
                  <div style={{ color: "#FBE3D8", fontWeight: 800 }}>CFR</div>
                </div>
                <div className="muted" style={{ textAlign: "center", maxWidth: 120 }}>
                  Central Firearms Registry. Quick CFR sign-in.
                </div>
                <button
                  type="button"
                  onClick={() => { setRole("cfr"); setStep("auth"); }}
                  className="cfr-btn"
                  style={{
                    marginTop: 6,
                    padding: "10px 8px",
                    borderRadius: 10,
                    border: "none",
                    cursor: "pointer",
                    background: accentGradient,
                    color: "#241705",
                    fontWeight: 700,
                    width: "100%",
                  }}
                >
                  CFR Login
                </button>
                <div className="muted" style={{ fontSize: 12, opacity: 0.9, marginTop: 8, textAlign: "center" }}>Special access</div>
              </div>

              {/* MIDDLE: model + hint */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div ref={mountRef} className="model-wrap" style={{ width: "100%", borderRadius: 8, overflow: "hidden", background: "transparent", boxShadow: "0 8px 30px rgba(0,0,0,0.5)" }} />
                <div className="muted">Hover to rotate. Click to punch. Nice preview.</div>
                {modelError && <div style={{ color: "#FAD08A", fontSize: 13 }}>{modelError}</div>}
              </div>

              {/* RIGHT: role buttons (card style) */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "stretch" }}>
                <div>
                  <h1 style={{ margin: 0, color: "#FBE3D8", fontSize: 28, fontWeight: 800 }}>Sign in</h1>
                  <p style={{ margin: "6px 0 0 0", color: "#E7C9BA", fontSize: 13 }}>Pick your role to continue — quick access.</p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                  {ROLES.filter(r => r !== "cfr").map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => { setRole(r); setTimeout(() => window.scrollTo(0, 0), 0); setStep("auth"); }}
                      className="role-card"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        padding: "12px 14px",
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.04)",
                        background: "rgba(0,0,0,0.15)",
                        color: "#FBE3D8",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      <div style={{ fontSize: 15, textTransform: "capitalize" }}>{r}</div>
                      <div style={{ fontSize: 12, opacity: 0.85 }}>Continue as {r}</div>
                    </button>
                  ))}
                </div>

                <div className="muted">Tip: sign up if you don't have an account.</div>
              </div>
            </div>
          </div>
        </>
      );
    }

    if (VARIANT === "B") {
      // Card grid with CFR highlighted at top-left of cards
      return (
        <>
          <style>{commonStyles}</style>
          <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: baseBg, padding: 18 }}>
            <div style={{ width: "100%", maxWidth: 980, padding: 20, borderRadius: 12, background: panelGradient, boxShadow: "0 20px 50px rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.03)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <div>
                  <h1 style={{ margin: 0, color: "#FBE3D8", fontSize: 24 }}>Welcome back</h1>
                  <div style={{ color: "#E7C9BA", fontSize: 13 }}>Choose your role — same colors, sharper cards.</div>
                </div>
                <div className="muted" style={{ fontSize: 13 }}>Model preview included</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 18 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
                  {ROLES.map((r) => (
                    <div
                      key={r}
                      onClick={() => { setRole(r); setStep("auth"); }}
                      className="role-card"
                      style={{
                        cursor: "pointer",
                        padding: 14,
                        borderRadius: 10,
                        background: r === "cfr" ? accentGradient : "rgba(255,255,255,0.02)",
                        color: r === "cfr" ? "#241705" : "#FBE3D8",
                        fontWeight: 800,
                        minHeight: 80,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                      }}
                    >
                      <div style={{ textTransform: "uppercase", fontSize: 13 }}>{r}</div>
                      <div style={{ fontSize: 12, opacity: 0.9, marginTop: 6, fontWeight: 600, color: r === "cfr" ? "#2b1a12" : "#E7C9BA" }}>
                        {r === "cfr" ? "Central Registry (fast)" : `Sign in as ${r}`}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div ref={mountRef} className="model-wrap" style={{ width: "100%", borderRadius: 10, overflow: "hidden", height: 320 }} />
                  {modelError && <div style={{ color: "#FAD08A" }}>{modelError}</div>}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div className="muted">Tip: hover the preview to rotate.</div>
                    <div>
                      <button onClick={() => navigate("/signup", { state: { role } })} className="small-link">Sign up</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      );
    }

    // VARIANT C (compact split)
    return (
      <>
        <style>{commonStyles}</style>
        <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: baseBg, padding: 12 }}>
          <div style={{ width: "100%", maxWidth: 980, display: "flex", gap: 18, alignItems: "center" }}>
            <div style={{ width: 160, padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.02)", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontWeight: 800, color: "#FBE3D8", fontSize: 16 }}>Quick login</div>
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => { setRole(r); setStep("auth"); }}
                  className="role-btn"
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: r === "cfr" ? "none" : "1px solid rgba(255,255,255,0.03)",
                    background: r === "cfr" ? accentGradient : "transparent",
                    color: r === "cfr" ? "#241705" : "#FBE3D8",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, padding: 14, borderRadius: 12, background: panelGradient, boxShadow: "0 20px 50px rgba(0,0,0,0.6)" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: 0, color: "#FBE3D8" }}>Sign in</h2>
                  <div style={{ color: "#E7C9BA", fontSize: 13 }}>Choose role on the left</div>
                </div>
                <div style={{ width: 260 }}>
                  <div ref={mountRef} className="model-wrap" style={{ width: "100%", height: 160, borderRadius: 8, overflow: "hidden" }} />
                </div>
              </div>
              <div style={{ marginTop: 12, color: "#CFAF9F", fontSize: 13 }}>Selected: <span style={{ color: "#F09410", fontWeight: 700 }}>{role || "none"}</span></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // AUTH UI (shared for all variants)
  return (
    <>
      <style>{commonStyles}</style>
      <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: baseBg, padding: 12 }}>
        <div style={{ width: "100%", maxWidth: 420, padding: 18, borderRadius: 12, background: panelGradient, boxShadow: "0 20px 50px rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.03)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <h2 style={{ margin: 0, color: "#FBE3D8", fontSize: 20 }}>{role} — Login</h2>
                <p style={{ margin: "6px 0 0 0", color: "#E7C9BA", fontSize: 13 }}>
                  Role selected: <span style={{ color: "#F09410", fontWeight: 600 }}>{role}</span>
                </p>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => { setStep("pick"); setErr(""); setTimeout(() => window.scrollTo(0, 0), 0); }}
                  className="nav-btn"
                  style={{ color: "#E7C9BA", textDecoration: "underline", background: "transparent", border: "none", cursor: "pointer" }}
                >
                  Change role
                </button>
              </div>
            </div>

            <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input required type="email" placeholder="Email" value={email} onChange={(ev) => setEmail(ev.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.02)", color: "#FBE3D8" }} />
              <input required type="password" placeholder="Password" value={password} onChange={(ev) => setPassword(ev.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.02)", color: "#FBE3D8" }} />
              <button type="submit" disabled={loading} className="submit-btn" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: accentGradient, color: "#241705", fontWeight: 700 }}>
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>

            {err && <div style={{ color: "#FF8A8A", fontSize: 13 }}>{err}</div>}
            {modelError && <div style={{ color: "#FAD08A", fontSize: 13 }}>{modelError}</div>}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
              <button type="button" onClick={() => navigate("/signup", { state: { role } })} className="small-link">Need an account? Sign up</button>
              <button type="button" onClick={() => { setEmail(""); setPassword(""); setErr(""); }} className="nav-btn" style={{ background: "transparent", border: "none", color: "#E7C9BA", cursor: "pointer" }}>
                Clear
              </button>
            </div>

            <div style={{ color: "#CFAF9F", fontSize: 12, marginTop: 8 }}>
              Tip: routes used are placeholders: <code style={{ background: "rgba(255,255,255,0.03)", padding: "2px 6px", borderRadius: 4, color: "#FBE3D8" }}>{roleToRoute(role)}</code>.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
