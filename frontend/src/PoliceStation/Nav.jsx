// src/PoliceStation/Nav.jsx
import React, { useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const THEME = {
  darkest: '#09110D',
  dark: '#0B3221',
  mid: '#135E3D',
  bright: '#1AA06D',
  textOnDark: '#E8F8F5'
};

const navItems = [
  { to: '/police/dashboard', label: 'Dashboard' },
  { to: '/police/receive', label: 'Received' },
  { to: '/police/inspections', label: 'Inspections' },
  { to: '/police/roster', label: 'Station Roster' },
  { to: '/police/audit', label: 'Audit' },
  { to: '/police/notifications', label: 'Notifications' }
];

export default function PoliceNav() {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, 3);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(3, 2, 3);
    scene.add(dir);

    const root = new THREE.Group();
    scene.add(root);

    const loader = new GLTFLoader();

    async function tryLoadGLB() {
      const candidates = [];
      try {
        const url = new URL('../assets/1.glb', import.meta.url).href;
        candidates.push(url);
      } catch {
        // ignore
      }
      candidates.push('/assets/1.glb', './assets/1.glb');

      for (let i = 0; i < candidates.length; i += 1) {
        const path = candidates[i];
        try {
          const res = await fetch(path, { method: 'GET' });
          if (!res.ok) continue;
          const ct = (res.headers.get('content-type') || '').toLowerCase();
          if (ct.includes('text/html') || ct.includes('application/json')) continue;
          const arrayBuffer = await res.arrayBuffer();
          loader.parse(
            arrayBuffer,
            '',
            (gltf) => {
              const obj = gltf.scene || gltf.scenes?.[0];
              if (!obj) return;
              const box = new THREE.Box3().setFromObject(obj);
              const size = box.getSize(new THREE.Vector3());
              const maxSide = Math.max(size.x, size.y, size.z);
              const scale = maxSide > 0 ? (1.0 / maxSide) : 1;
              obj.scale.setScalar(scale * 0.9);
              box.setFromObject(obj);
              const center = box.getCenter(new THREE.Vector3());
              obj.position.sub(center);
              root.add(obj);
            },
            (err) => {
              console.warn('GLTF parse error for', path, err);
            }
          );
          return;
        } catch {
          continue;
        }
      }
      console.warn('Could not load 1.glb from any candidate paths. Put 1.glb in your public folder at /assets/1.glb, or import it via your bundler and pass its URL.');
    }

    tryLoadGLB();

    let req = null;
    const clock = new THREE.Clock();

    function resizeRendererToDisplaySize() {
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = parent.clientWidth;
      const size = Math.min(120, Math.max(64, Math.floor(w * 0.18)));
      if (canvas.width !== size || canvas.height !== size) {
        renderer.setSize(size, size, false);
        camera.aspect = 1;
        camera.updateProjectionMatrix();
      }
    }

    function animate() {
      resizeRendererToDisplaySize();
      const dt = clock.getDelta();
      root.rotation.y += dt * 0.8;
      renderer.render(scene, camera);
      req = requestAnimationFrame(animate);
    }
    animate();

    function onWindowResize() {
      resizeRendererToDisplaySize();
    }
    window.addEventListener('resize', onWindowResize);

    return () => {
      window.removeEventListener('resize', onWindowResize);
      if (req) cancelAnimationFrame(req);
      renderer.dispose();
      scene.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else child.material.dispose();
        }
      });
    };
  }, []);

  // logout logic: clears common tokens and optionally calls server logout,
  // then navigates to /login
  const handleLogout = async () => {
    try {
      // clear client-side tokens (adjust key names as needed)
      const keys = ['access_token', 'supabase.auth.token', 'sb:token', 'token'];
      keys.forEach((k) => localStorage.removeItem(k));

      // optional: call server logout endpoint (if you have one)
      try {
        await fetch('/api/logout', { method: 'POST', credentials: 'include' });
      } catch  {
        // not critical — keep going
      }

      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout failed', err);
      // still navigate away to login
      navigate('/login', { replace: true });
    }
  };

  const navLinkClass = ({ isActive }) =>
    [
      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150',
      'text-[#E8F8F5] hover:bg-white/3',
      isActive ? 'bg-white/3 font-semibold shadow-inner before:content-[""]' : ''
    ].join(' ');

  return (
    <>
      {/* 
        Fixed left nav:
        - width: 240px (w-60)
        - full height: h-screen
        IMPORTANT: give your main page container a left margin equal to the nav width,
        e.g. <main className="ml-60"> ... </main> so main content doesn't go under the nav.
      */}
      <nav
        className="fixed top-0 left-0 h-screen w-60 p-4 flex flex-col gap-3 box-border border-r border-black/20"
        style={{ background: `linear-gradient(180deg, ${THEME.dark} 0%, ${THEME.mid} 100%)`, color: THEME.textOnDark }}
        aria-label="Police station navigation"
      >
        {/* header */}
        <div className="flex items-center gap-3 mb-1">
          <div
            className="rounded-lg overflow-hidden flex items-center justify-center"
            style={{
              width: 80,
              height: 80,
              background: THEME.dark,
              boxShadow: '0 6px 18px rgba(0,0,0,0.45)'
            }}
            aria-hidden
          >
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: '100%', display: 'block' }}
              width={80}
              height={80}
            />
          </div>
          <div className="flex flex-col leading-none">
            <div className="text-[16px] font-extrabold" style={{ color: THEME.bright }}>
              POLICE
            </div>
            <div className="text-xs opacity-90">Station dashboard</div>
          </div>
        </div>

        {/* nav links */}
        <div className="flex flex-col gap-2 mt-1">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass}>
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{
                  background: `linear-gradient(180deg, ${THEME.bright}, ${THEME.mid})`,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.45)'
                }}
              />
              <span>{item.label}</span>
              <span className="ml-auto opacity-90 text-sm">›</span>
            </NavLink>
          ))}
        </div>

        {/* spacer ensures footer sticks to bottom */}
        <div className="flex-1" />

        {/* footer + logout */}
        <div className="pt-2">
          <div className="font-semibold">Station: Central</div>
          <div className="mt-1 text-xs opacity-90">Status: All systems normal</div>

          <div className="mt-4">
            <button
              onClick={handleLogout}
              className="w-full text-left flex items-center justify-center gap-2 px-3 py-2 rounded-lg mt-3 border border-white/6 text-sm font-medium transition-transform active:scale-95"
              style={{
                background: 'linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.03))',
                color: THEME.textOnDark
              }}
              aria-label="Log out"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
