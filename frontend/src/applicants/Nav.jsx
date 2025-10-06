// src/applicants/components/Nav.jsx
import React, { Suspense } from 'react';
import { NavLink } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';
import logoGLB from '../assets/1.glb';

const COLORS = {
  primaryLight: '#7FA834',
  primary: '#568319',
  deepGreen: '#194118',
  darkBrown: '#26190F',
  magenta: '#8C1B6D',
  pink: '#D02893',
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    console.error('3D model error:', error);
  }
  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}

function RotatingModel({ src = logoGLB, speed = 0.4 }) {
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

export default function Nav({ className = '' }) {
  const linkClass = ({ isActive }) =>
    [
      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition',
      isActive ? 'text-white' : 'text-white/90 hover:opacity-95',
    ].join(' ');

  return (
    <aside
      className={`fixed left-0 top-0 w-64 h-screen p-4 flex flex-col justify-between z-50 ${className}`}
      aria-label="Applicant navigation"
      style={{ background: `linear-gradient(180deg, ${COLORS.primaryLight} 0%, ${COLORS.primary} 100%)` }}
    >
      <div>
        <div className="w-full h-36 mb-4 rounded-md overflow-hidden bg-white/5 flex items-center justify-center">
          <Canvas camera={{ position: [0, 0, 2.5], fov: 45 }}>
            <ambientLight intensity={0.8} />
            <directionalLight position={[5, 5, 5]} intensity={0.6} />
            <ErrorBoundary fallback={null}>
              <Suspense fallback={null}>
                <RotatingModel src={logoGLB} speed={0.6} />
              </Suspense>
            </ErrorBoundary>
            <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} />
          </Canvas>
        </div>

        <div className="mb-3 text-white">
          <div className="text-lg font-semibold">Applicant</div>
          <div className="text-xs opacity-80">Account</div>
        </div>

        <nav className="space-y-2">
          <NavLink
            to="/applicant/dashboard"
            className={({ isActive }) => linkClass({ isActive })}
            style={({ isActive }) => ({
              background: isActive ? COLORS.deepGreen : 'transparent',
            })}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 13h8V3H3v10zM13 21h8V11h-8v10zM13 3v8h8V3h-8zM3 21h8v-8H3v8z" />
            </svg>
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/applicant/profile"
            className={({ isActive }) => linkClass({ isActive })}
            style={({ isActive }) => ({
              background: isActive ? COLORS.deepGreen : 'transparent',
            })}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5z" />
              <path d="M21 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
            </svg>
            <span>Profile</span>
          </NavLink>

          <NavLink
            to="/applicant/wallet"
            className={({ isActive }) => linkClass({ isActive })}
            style={({ isActive }) => ({
              background: isActive ? COLORS.deepGreen : 'transparent',
            })}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 7h20v10H2z" />
              <path d="M16 7v4" />
            </svg>
            <span>Wallet</span>
          </NavLink>
        </nav>

        <div className="mt-6 pt-4 border-t border-white/10 text-xs text-white/85">
          <div className="mb-2">Quick links</div>
          <ul className="space-y-1">
            <li>
              <NavLink to="/applicant/profile" className="text-sm text-white/90 hover:underline">
                Edit profile
              </NavLink>
            </li>
            <li>
              <NavLink to="/applicant/wallet" className="text-sm text-white/90 hover:underline">
                View wallet
              </NavLink>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-6">
        <button
          type="button"
          className="w-full py-2 rounded-md font-semibold shadow-sm transition transform active:scale-95"
          style={{
            background: `linear-gradient(90deg, ${COLORS.magenta}, ${COLORS.pink})`,
            color: '#fff',
          }}
          onClick={() => {
            const ev = new CustomEvent('logout-request');
            window.dispatchEvent(ev);
          }}
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
