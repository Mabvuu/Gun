// frontend/src/MOJ/components/Nav.jsx
import React, { useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// Palette
const COLORS = {
  veryLight: '#EEF2F0',
  gray: '#858585',
  mint: '#63DBD5',
  teal: '#15696F',
  dark: '#282828',
};

export default function MOJNav() {
  const mountRef = useRef(null);
  const modelRef = useRef(null);
  const rendererRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ensure mount sizing/styling
    mount.style.width = '96px';
    mount.style.height = '96px';
    mount.style.display = 'flex';
    mount.style.alignItems = 'center';
    mount.style.justifyContent = 'center';

    const width = 96;
    const height = 96;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.width = `${width}px`;
    renderer.domElement.style.height = `${height}px`;
    renderer.domElement.style.display = 'block';
    rendererRef.current = renderer;

    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.6, 1.8);

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const dir = new THREE.DirectionalLight(0xffffff, 0.5);
    dir.position.set(5, 10, 7);
    scene.add(dir);

    // placeholder while loading
    const placeholder = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.22, 2),
      new THREE.MeshStandardMaterial({ color: COLORS.mint, transparent: true, opacity: 0.9 })
    );
    placeholder.position.y = 0;
    scene.add(placeholder);
    modelRef.current = placeholder;

    const loader = new GLTFLoader();

    // Candidate URLs (try bundler-resolved first, then public)
    const candidateUrls = [];
    try {
      candidateUrls.push(new URL('../../assets/1.glb', import.meta.url).href);
    } catch {
      // ignore environments where new URL resolution is not allowed
    }
    candidateUrls.push('/assets/1.glb', '/1.glb');

    const tryLoadSequential = (urls) => {
      if (!urls || urls.length === 0) {
        return Promise.reject(new Error('no-candidates'));
      }
      const url = urls[0];
      return new Promise((resolve, reject) => {
        loader.load(
          url,
          (gltf) => resolve({ url, gltf }),
          undefined,
          () => {
            // try next candidate
            console.warn(`MOJNav: failed to load GLB from ${url}`);
            tryLoadSequential(urls.slice(1)).then(resolve).catch(reject);
          }
        );
      });
    };

    tryLoadSequential(candidateUrls)
      .then(({ url, gltf }) => {
        console.info('MOJNav: loaded logo GLB from', url);
        scene.remove(placeholder);
        const model = gltf.scene || gltf.scenes?.[0];
        if (!model) {
          console.warn('MOJNav: gltf scene was empty; keeping placeholder');
          modelRef.current = placeholder;
          scene.add(placeholder);
          return;
        }

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const scale = 0.9 / maxDim;
        model.scale.setScalar(scale);

        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);

        // subtle material adjustments so it reads well on teal background
        model.traverse((child) => {
          if (child.isMesh && child.material) {
            try {
              child.material = child.material.clone();
              child.material.metalness = child.material.metalness ?? 0.3;
              child.material.roughness = child.material.roughness ?? 0.7;
            } catch {
              // ignore material clone issues
            }
          }
        });

        scene.add(model);
        modelRef.current = model;
      })
      .catch(() => {
        console.warn('MOJNav: failed to load any candidate GLB (placeholder will remain).');
      });

    // animate
    let rafId = null;
    const start = performance.now();
    const animate = (t) => {
      const elapsed = (t - start) / 1000;
      const m = modelRef.current;
      if (m) {
        m.position.y = Math.sin(elapsed * 2.2) * 0.06;
        m.rotation.y = elapsed * 0.6;
      }
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);

    // cleanup
    return () => {
      cancelAnimationFrame(rafId);
      try {
        if (renderer && mount && renderer.domElement && mount.contains(renderer.domElement)) {
          mount.removeChild(renderer.domElement);
        }
        renderer.dispose();
        if (renderer.getContext) {
          const gl = renderer.getContext();
          if (gl && gl.getExtension) gl.getExtension('WEBGL_lose_context')?.loseContext();
        }
      } catch {
        // ignore cleanup errors
      }
      rendererRef.current = null;
    };
  }, []);

  const linkStyle = ({ isActive }) => {
    const base = {
      display: 'block',
      padding: '10px 12px',
      borderRadius: 6,
      fontSize: 14,
      textDecoration: 'none',
      marginBottom: 8,
      transition: 'background 160ms, color 160ms',
      color: COLORS.veryLight,
      textAlign: 'left',
    };
    if (isActive) {
      return {
        ...base,
        background: COLORS.mint,
        color: COLORS.dark,
        fontWeight: 600,
      };
    }
    return { ...base, color: COLORS.veryLight, background: 'transparent' };
  };

  const navContainerStyle = {
    background: COLORS.teal,
    color: COLORS.veryLight,
    padding: 16,
    width: 220,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    height: '100vh',
    boxSizing: 'border-box',
    position: 'sticky',
    top: 0,
  };

  const topBlockStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  };

  const logoWrapStyle = {
    width: 96,
    height: 120,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
  };

  const titleStyle = {
    fontSize: 12,
    marginTop: 4,
    color: COLORS.veryLight,
    opacity: 0.95,
    textAlign: 'center',
    fontWeight: 700,
  };

  const bottomStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    alignItems: 'stretch',
  };

  function handleLogout() {
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    } catch {
      // ignore
    }
    navigate('/login');
  }

  return (
    <nav style={navContainerStyle} aria-label="MOJ navigation">
      <div style={topBlockStyle}>
        <div style={logoWrapStyle}>
          <div ref={mountRef} />
        </div>

        <div style={titleStyle}>Ministry of Justice</div>

        <div style={{ width: '100%', marginTop: 6 }}>
          <NavLink to="/moj/dashboard" style={linkStyle}>
            Dashboard
          </NavLink>
          <NavLink to="/moj/receive" style={linkStyle}>
            Receive
          </NavLink>
          <NavLink to="/moj/profile" style={linkStyle}>
            Profile
          </NavLink>
        </div>
      </div>

      <div style={bottomStyle}>
        <button
          onClick={handleLogout}
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            background: 'transparent',
            color: COLORS.veryLight,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            justifyContent: 'center',
            borderTop: `1px solid rgba(255,255,255,0.06)`,
            paddingTop: 14,
            paddingBottom: 14,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21 12H9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M13 19H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Logout
        </button>
      </div>
    </nav>
  );
}
