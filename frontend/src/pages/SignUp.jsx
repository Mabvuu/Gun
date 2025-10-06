// src/pages/SignUp.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supebaseClient';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// static Zimbabwe provinces + towns moved outside the component to satisfy eslint hook deps
const PROVINCES = [
  'Harare','Bulawayo','Manicaland','Mashonaland Central','Mashonaland East',
  'Mashonaland West','Masvingo','Matabeleland North','Matabeleland South','Midlands'
];

const TOWNS_MAP = {
  Harare: ['Harare','Chitungwiza','Epworth'],
  Bulawayo: ['Bulawayo','Esigodini','Nkayi'],
  Manicaland: ['Mutare','Buhera','Chipinge'],
  'Mashonaland Central': ['Bindura','Mount Darwin'],
  'Mashonaland East': ['Marondera','Murehwa'],
  'Mashonaland West': ['Chinhoyi','Kariba'],
  Masvingo: ['Masvingo','Chiredzi'],
  'Matabeleland North': ['Hwange','Beitbridge'],
  'Matabeleland South': ['Gwanda','Beitbridge South'],
  Midlands: ['Gweru','Kwekwe']
};

// import your .glb file from assets (adjust name/path if different)
import modelUrl from '../assets/2.glb'; // <-- make sure this path & filename match your project

export default function SignUp() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const allowedRoles = ['applicants','dealer','police','province','club','intel','moj']; // officer & district removed
  const [requestedRole, setRequestedRole] = useState('applicants');

  const [province, setProvince] = useState('');
  const [town, setTown] = useState('');
  const [clubName, setClubName] = useState('');
  const [policeStation, setPoliceStation] = useState('');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (province && TOWNS_MAP[province]) setTown(TOWNS_MAP[province][0]);
    else setTown('');
  }, [province]);

  async function createProfileIfAuth(userId) {
    if (!userId) return;
    const payload = {
      user_id: userId,
      email: email.toLowerCase(),
      requested_role: requestedRole,
      role: 'pending',
      province: province || null,
      town: town || null,
      club: clubName || null,
      police_station: policeStation || null
    };
    try {
      const { error } = await supabase.from('profiles').insert([payload]);
      if (error) console.error('Profile insert error:', error);
    } catch (insertErr) {
      console.error('Unexpected profile insert error:', insertErr);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErr(''); setMsg(''); setLoading(true);

    if (!allowedRoles.includes(requestedRole)) { setErr('Invalid role'); setLoading(false); return; }
    if (requestedRole === 'moj' && !province) { setErr('Select province for MOJ'); setLoading(false); return; }
    if (requestedRole === 'police' && !policeStation) { setErr('Enter/select police station'); setLoading(false); return; }
    if (requestedRole === 'club' && !clubName) { setErr('Enter/select club'); setLoading(false); return; }

    try {
      const { error: signError, data } = await supabase.auth.signUp({ email, password });
      if (signError) { setErr(signError.message || String(signError)); setLoading(false); return; }

      const userId = data?.user?.id ?? data?.id ?? null;
      const session = data?.session ?? null;

      if (userId && session) {
        await createProfileIfAuth(userId);
        setMsg('Signup successful. Role request pending admin approval.');
        setLoading(false);
        return;
      }

      // email confirm flow - persist pending request
      try {
        localStorage.setItem('pending_request_role', requestedRole);
        localStorage.setItem('pending_request_email', email.toLowerCase());
        localStorage.setItem('pending_request_province', province || '');
        localStorage.setItem('pending_request_town', town || '');
        localStorage.setItem('pending_request_club', clubName || '');
        localStorage.setItem('pending_request_police_station', policeStation || '');
      } catch (storageErr) {
        console.warn('Could not persist pending request to localStorage:', storageErr);
      }

      setMsg('Check your email to confirm signup. After confirming, your role request will be created.');
    } catch (signupErr) {
      console.error('Signup error:', signupErr);
      setErr('Unexpected signup error');
    } finally { setLoading(false); }
  }

  const townOptions = province && TOWNS_MAP[province] ? TOWNS_MAP[province] : [];

  // palette
  const colors = {
    bg: 'bg-[#3E1F10]',
    panelFrom: '#3C1C0F',
    panelTo: '#2E140C',
    accentFrom: '#F09410',
    accentTo: '#BC430D',
    lightText: '#FBE3D8',
    subText: '#E7C9BA'
  };

  // refs for Three.js canvas
  const canvasParentRef = useRef(null);

  useEffect(() => {
    // --- Three.js setup ---
    if (!canvasParentRef.current) return;
    const parent = canvasParentRef.current;

    // base sizes (will respond to parent dimensions)
    let width = parent.clientWidth || 120;
    let height = parent.clientHeight || 120;

    const scene = new THREE.Scene();

    // camera slightly closer and with a bit more vertical room to show the bottom
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000);
    camera.position.set(0, 0.9, 2.2);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setClearColor(0x000000, 0); // transparent

    // append canvas
    parent.appendChild(renderer.domElement);

    // lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(3, 5, 2);
    scene.add(dir);

    // container for model
    const root = new THREE.Group();
    scene.add(root);

    // load model
    const loader = new GLTFLoader();
    let model = null;
    loader.load(
      modelUrl,
      (gltf) => {
        model = gltf.scene || gltf.scenes?.[0];
        if (!model) return;

        // compute bounding box to scale uniformly
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z) || 1;

        // increase scale so the gun appears larger on signup (was 1.2 before)
        const scale = (1.0 / maxDim) * 1.6; // bumped up from 1.2 -> 1.6
        model.scale.setScalar(scale);

        // re-center after scaling
        const box2 = new THREE.Box3().setFromObject(model);
        const center2 = box2.getCenter(new THREE.Vector3());
        model.position.sub(center2);

        // ensure the bottom is visible — lift model up by the absolute bottom amount plus small padding
        const bottomY = box2.min.y;
        // add enough padding to avoid clipping at small canvases
        model.position.y += Math.abs(bottomY) + 0.06;

        // slight forward adjustment if needed
        model.position.z = 0;

        root.add(model);
      },
      undefined,
      (err) => {
        console.error('GLTF load error:', err);
      }
    );

    // keep slow auto-rotation + mouse-driven rotation
    let mouseX = 0;
    let mouseY = 0;
    function onMouseMove(e) {
      const r = parent.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width; // 0..1
      const ny = (e.clientY - r.top) / r.height; // 0..1
      mouseX = (nx - 0.5) * 2; // -1..1
      mouseY = (ny - 0.5) * 2; // -1..1
    }
    parent.addEventListener('mousemove', onMouseMove);

    // handle touch too
    function onTouchMove(e) {
      if (!e.touches || e.touches.length === 0) return;
      onMouseMove(e.touches[0]);
    }
    parent.addEventListener('touchmove', onTouchMove, { passive: true });

    let rafId;
    const clock = new THREE.Clock();

    function animate() {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // gentle idle rotation
      root.rotation.y = 0.25 * t;

      // apply mouse offset as additional rotation (smoothed)
      const mx = mouseX * 0.6;
      const my = mouseY * 0.35;
      // blend with idle rotation for subtlety
      root.rotation.y = root.rotation.y * 0.7 + mx * 0.3 + 0.25 * t * 0.3;
      root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, my * -0.35, 0.08);

      renderer.render(scene, camera);
    }
    animate();

    // handle resize
    function onResize() {
      width = parent.clientWidth || 120;
      height = parent.clientHeight || 120;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }
    window.addEventListener('resize', onResize);

    // cleanup
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      parent.removeEventListener('mousemove', onMouseMove);
      parent.removeEventListener('touchmove', onTouchMove);
      // dispose scene/renderer resources
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [canvasParentRef]);

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${colors.bg}`}>
      <div className="w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden"
           style={{ background: `linear-gradient(180deg, ${colors.panelFrom} 0%, ${colors.panelTo} 100%)`, border: '1px solid rgba(255,255,255,0.03)' }}>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          {/* LEFT: threejs canvas / branding */}
          <div className="px-6 py-6 md:py-8 md:px-8 flex items-start">
            <div className="w-full flex flex-col items-start gap-4">
              <div
                className="w-32 h-32 md:w-40 md:h-40 rounded-md overflow-hidden flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(240,208,199,0.06), rgba(251,231,217,0.03))' }}
              >
                {/* Three.js canvas sits here */}
                <div
                  ref={canvasParentRef}
                  style={{ width: '120px', height: '120px', touchAction: 'none' }}
                  aria-hidden
                />
              </div>

              <div>
                <h3 className="text-lg md:text-xl font-extrabold" style={{ color: colors.lightText }}>Create account</h3>
                <p className="mt-1 text-sm" style={{ color: colors.subText }}>Fast signup — request the role you need.</p>
              </div>

              <div className="hidden md:block mt-2 text-sm" style={{ color: colors.subText }}>
                Need help? <button className="underline text-[inherit]" onClick={() => navigate('/')}>Back to login</button>
              </div>
            </div>
          </div>

          {/* RIGHT: form area */}
          <div className="col-span-1 md:col-span-2 px-6 py-6 md:py-8 md:px-10">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium" style={{ color: colors.subText }}>Email</label>
                  <input required type="email" value={email} onChange={(ev)=>setEmail(ev.target.value)}
                         className="mt-1 w-full px-3 py-2 rounded-md bg-[rgba(0,0,0,0.45)] border border-[rgba(255,255,255,0.06)] text-[inherit] focus:outline-none"
                         style={{ color: colors.lightText }} />
                </div>

                <div>
                  <label className="block text-sm font-medium" style={{ color: colors.subText }}>Password</label>
                  <input required type="password" value={password} onChange={(ev)=>setPassword(ev.target.value)}
                         className="mt-1 w-full px-3 py-2 rounded-md bg-[rgba(0,0,0,0.45)] border border-[rgba(255,255,255,0.06)] text-[inherit] focus:outline-none"
                         style={{ color: colors.lightText }} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium" style={{ color: colors.subText }}>Request role</label>
                <select value={requestedRole} onChange={(ev)=>setRequestedRole(ev.target.value)}
                        className="mt-1 w-full px-3 py-2 rounded-md bg-[rgba(0,0,0,0.45)] border border-[rgba(255,255,255,0.06)]"
                        style={{ color: colors.lightText }}>
                  {allowedRoles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* conditional blocks */}
              {(requestedRole === 'moj' || requestedRole === 'club' || requestedRole === 'police' || requestedRole === 'dealer' || requestedRole === 'province') && (
                <div>
                  <label className="block text-sm font-medium" style={{ color: colors.subText }}>Province</label>
                  <select value={province} onChange={(ev)=>setProvince(ev.target.value)}
                          className="mt-1 w-full px-3 py-2 rounded-md h-36 overflow-auto bg-[rgba(0,0,0,0.45)] border border-[rgba(255,255,255,0.06)]"
                          style={{ color: colors.lightText }}>
                    <option value="">-- select province --</option>
                    {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              )}

              {(requestedRole === 'club' || requestedRole === 'police' || requestedRole === 'dealer') && (
                <div>
                  <label className="block text-sm font-medium" style={{ color: colors.subText }}>Town</label>
                  <select value={town} onChange={(ev)=>setTown(ev.target.value)}
                          className="mt-1 w-full px-3 py-2 rounded-md h-36 overflow-auto bg-[rgba(0,0,0,0.45)] border border-[rgba(255,255,255,0.06)]"
                          style={{ color: colors.lightText }}>
                    <option value="">-- select town --</option>
                    {townOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}

              {requestedRole === 'club' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium" style={{ color: colors.subText }}>Club name</label>
                    <input value={clubName} onChange={(ev)=>setClubName(ev.target.value)}
                           className="mt-1 w-full px-3 py-2 rounded-md bg-[rgba(0,0,0,0.45)] border border-[rgba(255,255,255,0.06)]"
                           style={{ color: colors.lightText }} />
                  </div>
                  <div>
                    {/* left intentionally blank to keep grid consistent */}
                  </div>
                </div>
              )}

              {requestedRole === 'police' && (
                <div>
                  <label className="block text-sm font-medium" style={{ color: colors.subText }}>Police station</label>
                  <input value={policeStation} onChange={(ev)=>setPoliceStation(ev.target.value)}
                         placeholder="Enter station name"
                         className="mt-1 w-full px-3 py-2 rounded-md bg-[rgba(0,0,0,0.45)] border border-[rgba(255,255,255,0.06)]"
                         style={{ color: colors.lightText }} />
                </div>
              )}

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 rounded-md font-semibold"
                  style={{
                    background: `linear-gradient(90deg, ${colors.accentFrom}, ${colors.accentTo})`,
                    color: '#241705',
                    boxShadow: '0 8px 30px rgba(188,67,13,0.18)'
                  }}
                >
                  {loading ? 'Signing up...' : 'Sign up'}
                </button>
              </div>
            </form>

            {msg && <p className="mt-4 text-sm text-green-300">{msg}</p>}
            {err && <p className="mt-4 text-sm text-red-400">{err}</p>}

            <div className="mt-6 flex items-center justify-between">
              <button onClick={()=>navigate('/')} className="text-sm underline" style={{ color: colors.subText }}>Back to login</button>
              <div className="text-xs" style={{ color: '#CFAF9F' }}>
                <span>Tip: admin will review role requests.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
