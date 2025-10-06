// src/Club/Nav.jsx
import React, { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// If your .glb lives in src/assets/1.glb this import should work.
// Otherwise change the path accordingly (e.g. '../../assets/1.glb' or '/assets/1.glb').
import logoGLB from '../assets/1.glb';

const COLORS = {
  gold: '#DAA112',
  sage: '#809276',
  olive: '#666E51',
  deepTeal: '#10383A',
  slate: '#768886'
};

const BASE = '/club';

const LINKS = [
  { to: `${BASE}/dashboard`, label: 'Dashboard' },
  { to: `${BASE}/receive`, label: 'Application Receive' },
  { to: `${BASE}/members`, label: 'Members' },
  { to: `${BASE}/upload-membership`, label: 'Upload Membership' },
  { to: `${BASE}/attendance`, label: 'Attendance Log' },
  { to: `${BASE}/view`, label: 'View' },
  { to: `${BASE}/notifications`, label: 'Notifications' }
];

function Logo3D({ src, size = 64 }) {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000, 0); // transparent-ish

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size);
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 2.5);

    // lighting
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    hemi.position.set(0, 1, 0);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(2, 2, 2);
    scene.add(dir);

    const loader = new GLTFLoader();
    let model = null;
    let mixer = null;

    let frameId;
    loader.load(
      src,
      (gltf) => {
        model = gltf.scene || gltf.scenes[0];
        // center & scale model to fit the box
        const box = new THREE.Box3().setFromObject(model);
        const sizeVec = new THREE.Vector3();
        box.getSize(sizeVec);
        const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
        const scale = maxDim > 0 ? (1.2 / maxDim) : 1;
        model.scale.setScalar(scale);
        box.setFromObject(model);
        box.getCenter(sizeVec).multiplyScalar(-1);
        model.position.copy(sizeVec);

        // slight rotation for nicer look
        model.rotation.y = Math.PI * 0.05;
        scene.add(model);

        // If the model has animations, set up mixer
        if (gltf.animations && gltf.animations.length) {
          mixer = new THREE.AnimationMixer(model);
          gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
        }
      },
      undefined,
      (err) => {
        // fallback: simple box so UI doesn't look empty
        const cube = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.6, 0.6),
          new THREE.MeshStandardMaterial({ color: 0x666666 })
        );
        scene.add(cube);
        console.error('Error loading GLB logo:', err);
      }
    );

    const clock = new THREE.Clock();

    const animate = () => {
      const delta = clock.getDelta();
      if (mixer) mixer.update(delta);

      // gently rotate the model (if present)
      if (model) model.rotation.y += 0.003;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(size, size);
      camera.aspect = 1;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);

    // cleanup
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);

      if (mixer) {
        mixer.stopAllAction();
        mixer.uncacheRoot && mixer.uncacheRoot(model);
      }

      renderer.dispose();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose && m.dispose());
          } else {
            obj.material.dispose && obj.material.dispose();
          }
        }
      });

      // remove canvas element
      if (renderer.domElement && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [src, size]);

  return <div ref={mountRef} style={{ width: size, height: size }} />;
}

export default function ClubNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const isActive = (linkPath) =>
    pathname === linkPath || pathname.startsWith(`${linkPath}/`);

  const handleLogout = (e) => {
    e.preventDefault();
    navigate('/');
  };

  return (
    <aside
      className="w-64 hidden md:flex flex-col"
      aria-label="Club navigation"
      style={{
        background: COLORS.deepTeal,
        position: 'sticky',    // keep in viewport while page scrolls
        top: 0,
        alignSelf: 'flex-start',
        height: '100vh',      // same size as page
        overflow: 'hidden',   // inner nav will scroll if content overflows
        zIndex: 30
      }}
    >
      {/* Top: logo + title */}
      <div className="px-6 py-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center space-x-3">
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 6,
              overflow: 'hidden',
              background: COLORS.olive,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Logo3D src={logoGLB} size={74} />
          </div>

          <div>
            <div className="text-lg font-semibold" style={{ color: COLORS.gold }}>
              Club
            </div>
            <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Dashboard
            </div>
          </div>
        </div>
      </div>

      {/* Navigation links - make this scroll independently if needed */}
      <nav
        className="flex-1 px-2 py-4 space-y-1"
        aria-label="Main"
        style={{ overflowY: 'auto', paddingRight: 8 }}
      >
        {LINKS.map((l) => {
          const active = isActive(l.to);
          return (
            <Link
              key={l.to}
              to={l.to}
              className={`block px-4 py-3 rounded-l-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-opacity-80 text-white'
                  : 'text-[rgba(255,255,255,0.85)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[rgba(255,255,255,1)]'
              }`}
              aria-current={active ? 'page' : undefined}
              style={active ? { background: COLORS.sage, color: COLORS.deepTeal, borderRight: `4px solid ${COLORS.gold}` } : undefined}
            >
              {l.label}
            </Link>
          );
        })}

        <hr className="my-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />

        <div className="px-2 mt-2">
          <Link to="/club" className="block text-sm px-4 py-2" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Back to club home
          </Link>
        </div>
      </nav>

      {/* Footer: Back to site + Logout at the absolute bottom */}
      <div className="px-4 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="mb-2">
          <Link to="/" className="block text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Back to site home
          </Link>
        </div>

        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 rounded-md text-sm font-medium hover:opacity-90"
          style={{
            background: 'transparent',
            color: COLORS.gold,
            border: `1px solid rgba(255,255,255,0.06)`
          }}
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
