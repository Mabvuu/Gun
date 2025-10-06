// src/Province/pages/Dashboard.jsx
import React, { useEffect, useState, useRef } from "react";
import { supabase, getCurrentUser } from "../../supebaseClient";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import modelPath from "../../assets/1.glb";

const COLORS = {
  licorice: "#1E0D0A",
  rosewood: "#550006",
  mahogany: "#BF353B",
  froly: "#EE666A",
  deepMoss: "#3D4421",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const currentUser = await getCurrentUser();
        if (mounted) setUser(currentUser);
      } catch (err) {
        console.error("Init error", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const mountNode = canvasRef.current;
    if (!mountNode) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.z = 2.5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(120, 120);
    mountNode.appendChild(renderer.domElement);

    const light = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(light);

    const loader = new GLTFLoader();
    loader.load(modelPath, (gltf) => {
      const model = gltf.scene;
      model.scale.set(0.7, 0.7, 0.7);
      model.rotation.y = Math.PI / 4;
      scene.add(model);

      const animate = () => {
        requestAnimationFrame(animate);
        model.rotation.y += 0.01;
        renderer.render(scene, camera);
      };
      animate();
    });

    return () => {
      mountNode.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  async function signOut() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out error", err);
    } finally {
      navigate("/");
    }
  }

  if (loading)
    return (
      <div className="p-6 max-w-2xl mx-auto text-center text-gray-600">
        Loading dashboard...
      </div>
    );

  if (!user) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <p className="mb-4 text-gray-700">You are not signed in.</p>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 bg-[#BF353B] hover:bg-[#EE666A] text-white rounded shadow"
        >
          Go to login
        </button>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-10 px-6 text-white"
      style={{
        background: `linear-gradient(135deg, ${COLORS.licorice}, ${COLORS.mahogany}, ${COLORS.froly})`,
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-12 max-w-6xl mx-auto">
        <div>
          <h1 className="text-4xl font-extrabold drop-shadow-lg">
            Province Dashboard
          </h1>
          <p className="text-sm opacity-80">Signed in as {user.email}</p>
        </div>
        <button
          onClick={signOut}
          className="px-5 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-semibold shadow-md"
        >
          Sign out
        </button>
      </div>

      {/* Hero with 3D emblem */}
      <div className="flex justify-center mb-16">
        <div
          ref={canvasRef}
          className="rounded-full shadow-xl bg-white/10 p-4 backdrop-blur-lg"
        ></div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
        {[
          { label: "Pending Applications", value: 12 },
          { label: "Reports Generated", value: 48 },
          { label: "System Alerts", value: 5 },
        ].map((stat, i) => (
          <div
            key={i}
            className="p-6 rounded-xl bg-white/10 backdrop-blur-md shadow-lg hover:shadow-xl transition transform hover:-translate-y-1"
          >
            <h3 className="text-3xl font-bold mb-2">{stat.value}</h3>
            <p className="text-sm opacity-90">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        <div className="p-6 rounded-xl bg-white/10 backdrop-blur-md hover:bg-white/20 transition shadow-lg">
          <h2 className="text-xl font-semibold mb-2">Reports</h2>
          <p className="text-sm opacity-80 mb-4">
            View and analyze provincial reports.
          </p>
          <button
            onClick={() => navigate("/province/reports")}
            className="px-4 py-2 rounded bg-[#EE666A] hover:bg-[#BF353B] shadow"
          >
            Open Reports
          </button>
        </div>

        <div className="p-6 rounded-xl bg-white/10 backdrop-blur-md hover:bg-white/20 transition shadow-lg">
          <h2 className="text-xl font-semibold mb-2">Applications</h2>
          <p className="text-sm opacity-80 mb-4">
            Manage incoming license applications.
          </p>
          <button
            onClick={() => navigate("/province/application/1")}
            className="px-4 py-2 rounded bg-[#EE666A] hover:bg-[#BF353B] shadow"
          >
            View Applications
          </button>
        </div>

        <div className="p-6 rounded-xl bg-white/10 backdrop-blur-md hover:bg-white/20 transition shadow-lg">
          <h2 className="text-xl font-semibold mb-2">Notifications</h2>
          <p className="text-sm opacity-80 mb-4">
            Stay updated with system alerts.
          </p>
          <button
            onClick={() => navigate("/province/notifications")}
            className="px-4 py-2 rounded bg-[#EE666A] hover:bg-[#BF353B] shadow"
          >
            View Notifications
          </button>
        </div>
      </div>
    </div>
  );
}
