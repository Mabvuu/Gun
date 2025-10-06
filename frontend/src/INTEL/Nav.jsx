import React, { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import modelUrl from "../assets/1.glb";

// RotatingLogo component stays the same
function RotatingLogo({ src = modelUrl, size = 120 }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    let raf = null;
    let renderer = null;
    let scene = null;
    let camera = null;
    let model = null;
    let mixer = null;

    async function init() {
      try {
        const THREE = await import("three");
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader");

        if (!mounted) return;

        const canvas = canvasRef.current;
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(size, size, false);
        if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
        camera.position.set(0, 0, 3);

        const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
        scene.add(hemi);
        const dir = new THREE.DirectionalLight(0xffffff, 0.8);
        dir.position.set(5, 10, 7.5);
        scene.add(dir);

        const loader = new GLTFLoader();
        loader.load(
          src,
          (gltf) => {
            if (!mounted) return;
            model = gltf.scene || gltf.scenes?.[0];
            if (!model) {
              setError(new Error("GLB loaded but no scene found"));
              return;
            }

            const box = new THREE.Box3().setFromObject(model);
            const sizeVec = new THREE.Vector3();
            box.getSize(sizeVec);
            const maxDim = Math.max(sizeVec.x || 0, sizeVec.y || 0, sizeVec.z || 0) || 1;
            const scale = 1.2 / maxDim;
            model.scale.setScalar(scale);
            box.getCenter(sizeVec).multiplyScalar(-1);
            model.position.copy(sizeVec);

            scene.add(model);

            if (gltf.animations && gltf.animations.length) {
              mixer = new THREE.AnimationMixer(model);
              mixer.clipAction(gltf.animations[0]).play();
            }
          },
          undefined,
          (err) => {
            console.error("GLTF load error for", src, err);
            setError(err);
          }
        );

        const clock = new THREE.Clock();
        function animate() {
          const dt = clock.getDelta();
          if (mixer) mixer.update(dt);
          if (model) model.rotation.y += dt * 0.8;
          renderer.render(scene, camera);
          if (mounted) raf = requestAnimationFrame(animate);
        }
        animate();
      } catch (e) {
        console.error("RotatingLogo init error", e);
        setError(e);
      }
    }

    init();

    return () => {
      mounted = false;
      if (raf) cancelAnimationFrame(raf);
      try {
        if (renderer) renderer.dispose();
        if (scene) {
          scene.traverse((o) => {
            if (o.geometry && o.geometry.dispose) o.geometry.dispose();
            if (o.material) {
              if (Array.isArray(o.material)) {
                o.material.forEach((m) => m && m.dispose && m.dispose());
              } else if (o.material.dispose) {
                o.material.dispose();
              }
            }
          });
        }
      } catch {
        /* ignore */
      }
    };
  }, [src, size]);

  return (
    <div
      className="w-[120px] h-[120px] rounded-md overflow-hidden mb-3 flex items-center justify-center"
      style={{ backgroundColor: "#0B3221" }}
    >
      {error ? (
        <div className="text-xs text-red-300 text-center px-2">Logo failed to load. See console.</div>
      ) : (
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          aria-label="rotating 3d logo"
          style={{ width: size, height: size }}
        />
      )}
    </div>
  );
}

const linkBase = "block px-3 py-2 rounded-md mb-1 transition-colors text-sm";
const linkInactive = "text-[#CDEDD7] hover:bg-[#0B3221] hover:text-white";
const linkActive = "font-semibold bg-[#135E3D] text-white shadow-sm";

export default function Nav() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Remove common auth tokens
    const keys = ["access_token", "supabase.auth.token", "sb:token", "token"];
    keys.forEach((k) => localStorage.removeItem(k));

    // Navigate to login page
    navigate("/", { replace: true });
  };

  return (
    <nav className="w-56 min-w-[14rem] h-screen flex flex-col p-4" style={{ backgroundColor: "#09110D", color: "#E6F7EE" }}>
      <div className="flex flex-col items-center mb-4">
        <RotatingLogo src={modelUrl} size={120} />
        <h3 className="text-lg font-semibold text-[#CFEFE0]">Intel</h3>
      </div>

      <div className="mt-3">
        <NavLink to="/int/dashboard" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>Dashboard</NavLink>
        <NavLink to="/int/analytics" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>Analytics</NavLink>
        <NavLink to="/int/receive/1" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>Receive (Example)</NavLink>
        <NavLink to="/int/annotate/1" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>Annotate (Example)</NavLink>
      </div>

      <div className="mt-auto">
        <button
          onClick={handleLogout}
          className="w-full text-left flex items-center justify-center px-3 py-2 rounded-md transition-all"
          style={{ backgroundColor: "#135E3D", color: "#fff", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          Logout
        </button>
        <div className="text-xs text-[#9FBFAD] mt-2 text-center">v1.0</div>
      </div>
    </nav>
  );
}
