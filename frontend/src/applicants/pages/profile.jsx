// src/applicants/pages/profile.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

const PROVINCES = {
  Harare: ["Harare", "Chitungwiza", "Epworth"],
  Bulawayo: ["Bulawayo", "Esigodini"],
  Manicaland: ["Mutare", "Chimanimani", "Nyanga"],
  "Mashonaland Central": ["Bindura", "Mazowe"],
  "Mashonaland East": ["Marondera", "Mudzi"],
  "Mashonaland West": ["Chinhoyi", "Karoi"],
  Masvingo: ["Masvingo", "Chiredzi"],
  "Matabeleland North": ["Hwange", "Binga"],
  "Matabeleland South": ["Beitbridge", "Gwanda"],
  Midlands: ["Gweru", "Kwekwe", "Chirumhanzu"],
};

const COLORS = {
  primaryLight: "#7FA834",
  primary: "#568319",
  surface: "#F6FBF6",
  card: "#FFFFFF",
  textDark: "#0B1F11",
  muted: "#6B7280",
  magenta: "#8C1B6D",
  pink: "#D02893",
};

export default function Profile() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "",
    gender: "",
    id_number: "",
    dob: "",
    phone: "",
    email: "",
    address: "",
    province: "",
    city: "",
    shooting_club: "",
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [pdf1, setPdf1] = useState(null);
  const [pdf2, setPdf2] = useState(null);
  const [isExisting, setIsExisting] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/profile`, { credentials: "include" });
        if (!r.ok) {
          if (mounted) setLoading(false);
          return;
        }
        const d = await r.json();
        if (!mounted) return;
        if (d) {
          setProfile((p) => ({
            ...p,
            full_name: d.full_name || "",
            gender: d.gender || "",
            id_number: d.id_number || "",
            dob: d.dob ? d.dob.slice(0, 10) : "",
            phone: d.phone || "",
            email: d.email || "",
            address: d.address || "",
            province: d.province || "",
            city: d.city || "",
            shooting_club: d.shooting_club || "",
          }));
          if (d.photo_url) setPhotoPreview(d.photo_url);
          setIsExisting(true);
          try {
            localStorage.setItem("applicant_profile", JSON.stringify(d));
          } catch (e) {
            console.warn("localStorage set error:", e);
          }
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      if (photoPreview && photoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, ); // run once

  function setField(name, value) {
    setProfile((p) => ({ ...p, [name]: value }));
  }

  function onProvinceChange(e) {
    const prov = e.target.value;
    setField("province", prov);
    const cities = PROVINCES[prov] || [];
    setField("city", cities[0] || "");
  }

  function onCityChange(e) {
    setField("city", e.target.value);
  }

  function onFileChange(e) {
    const { name, files } = e.target;
    if (name === "pdf1") setPdf1(files[0] || null);
    if (name === "pdf2") setPdf2(files[0] || null);
  }

  function onPhotoPick(e) {
    const f = e.target.files?.[0] || null;
    if (!f) {
      if (photoPreview && photoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
      setPhotoFile(null);
      setPhotoPreview(null);
      return;
    }
    if (photoPreview && photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  }

  async function fetchAndStoreProfile() {
    try {
      const r = await fetch(`${API_BASE}/profile`, { credentials: "include" });
      if (!r.ok) return null;
      const d = await r.json();
      if (d) {
        try {
          localStorage.setItem("applicant_profile", JSON.stringify(d));
        } catch (e) {
          console.warn("localStorage set error:", e);
        }
      }
      return d;
    } catch (err) {
      console.error("fetchAndStoreProfile error:", err);
      return null;
    }
  }

  async function submit(method) {
    setMsg("");
    if (!profile.full_name || !profile.id_number) {
      setMsg("Full name & ID required");
      return;
    }
    if (!isExisting && (!profile.province || !profile.city)) {
      setMsg("Province & City required");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      const fields = {
        full_name: profile.full_name,
        gender: profile.gender,
        id_number: profile.id_number,
        dob: profile.dob,
        phone: profile.phone,
        email: profile.email,
        address: profile.address,
        province: profile.province,
        city: profile.city,
        shooting_club: profile.shooting_club,
      };

      Object.entries(fields).forEach(([k, v]) => {
        if (v !== undefined && v !== null) fd.append(k, v);
      });

      if (photoFile) fd.append("photo", photoFile);
      if (pdf1) fd.append("pdf1", pdf1);
      if (pdf2) fd.append("pdf2", pdf2);

      const url =
        method === "PUT"
          ? `${API_BASE}/profile/${encodeURIComponent(profile.id_number)}`
          : `${API_BASE}/profile`;

      const res = await fetch(url, { method, body: fd, credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const text = body?.error || (await res.text().catch(() => null)) || "Submit failed";
        throw new Error(text);
      }

      let data = null;
      try {
        data = await res.json().catch(() => null);
      } catch (err) {
        console.warn("Response parse warning:", err);
        data = null;
      }

      if (!data) {
        data = await fetchAndStoreProfile();
      } else {
        try {
          localStorage.setItem("applicant_profile", JSON.stringify(data));
        } catch (e) {
          console.warn("localStorage set error:", e);
        }
      }

      if (data) {
        setProfile((p) => ({
          ...p,
          full_name: data.full_name || p.full_name,
          gender: data.gender || p.gender,
          id_number: data.id_number || p.id_number,
          dob: data.dob ? data.dob.slice(0, 10) : p.dob,
          phone: data.phone || p.phone,
          email: data.email || p.email,
          address: data.address || p.address,
          province: data.province || p.province,
          city: data.city || p.city,
          shooting_club: data.shooting_club || p.shooting_club,
        }));
        if (data.photo_url) setPhotoPreview(data.photo_url);
        setIsExisting(true);
      }

      navigate("/applicant/dashboard");
    } catch (err) {
      console.error("submit error:", err);
      setMsg(err.message || "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    await submit(isExisting ? "PUT" : "POST");
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-100 rounded-lg" />
        </div>
      </div>
    );
  }

  const cityOptions = PROVINCES[profile.province] || [];

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div
        className="bg-white rounded-2xl shadow-md overflow-hidden grid grid-cols-1 md:grid-cols-3 gap-6 p-6"
        style={{ background: COLORS.card }}
      >
        {/* left: avatar / quick info */}
        <div className="md:col-span-1 flex flex-col items-center">
          <div
            className="w-44 h-44 rounded-xl overflow-hidden shadow-inner border"
            style={{
              background:
                photoPreview
                  ? `url(${photoPreview}) center/cover`
                  : `linear-gradient(180deg, ${COLORS.primaryLight}, ${COLORS.primary})`,
            }}
          />
          <div className="mt-4 text-center">
            <div className="text-lg font-semibold" style={{ color: COLORS.textDark }}>
              {profile.full_name || "Your name"}
            </div>
            <div className="text-sm text-gray-500">{profile.shooting_club || "No club specified"}</div>
          </div>

          <div className="mt-6 flex gap-3">
            <label
              htmlFor="photo"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium shadow"
              style={{ background: `linear-gradient(90deg, ${COLORS.magenta}, ${COLORS.pink})`, cursor: "pointer" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                <path d="M4 3a1 1 0 000 2h2l1 2h6l1-2h2a1 1 0 100-2H4zM3 8a1 1 0 011-1h12a1 1 0 011 1v6a3 3 0 01-3 3H6a3 3 0 01-3-3V8z" />
              </svg>
              Change
            </label>
            <input id="photo" ref={fileRef} type="file" accept="image/*" onChange={onPhotoPick} className="hidden" />

            <button
              type="button"
              className="px-4 py-2 rounded-lg border text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => {
                setPhotoFile(null);
                if (photoPreview && photoPreview.startsWith("blob:")) {
                  URL.revokeObjectURL(photoPreview);
                }
                setPhotoPreview(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              Clear
            </button>
          </div>

          <div className="mt-6 w-full text-xs text-gray-500 text-center px-2">
            <div>Accepted formats: JPG, PNG • Max 5MB</div>
            <div className="mt-2">Photos help us verify your identity faster.</div>
          </div>
        </div>

        {/* right: form */}
        <form onSubmit={onSubmit} className="md:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600">Full name *</label>
              <input
                name="full_name"
                value={profile.full_name}
                onChange={(e) => setField("full_name", e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2"
                style={{ borderColor: "#E6EAE6" }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600">Gender</label>
              <select
                value={profile.gender}
                onChange={(e) => setField("gender", e.target.value)}
                className="mt-1 block w-full rounded-lg border px-3 py-2 bg-white"
                style={{ borderColor: "#E6EAE6" }}
              >
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600">ID number *</label>
              <input
                name="id_number"
                value={profile.id_number}
                onChange={(e) => setField("id_number", e.target.value)}
                required
                disabled={isExisting}
                className={`mt-1 block w-full rounded-lg border px-3 py-2 focus:outline-none ${
                  isExisting ? "bg-gray-50 text-gray-500" : "bg-white"
                }`}
                style={{ borderColor: "#E6EAE6" }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600">Date of birth</label>
              <input
                type="date"
                value={profile.dob}
                onChange={(e) => setField("dob", e.target.value)}
                className="mt-1 block w-full rounded-lg border px-3 py-2"
                style={{ borderColor: "#E6EAE6" }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600">Province {isExisting ? "" : "*"}</label>
              <select
                value={profile.province}
                onChange={onProvinceChange}
                required={!isExisting}
                className="mt-1 block w-full rounded-lg border px-3 py-2 bg-white"
                style={{ borderColor: "#E6EAE6" }}
              >
                <option value="">Select province</option>
                {Object.keys(PROVINCES).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600">City {isExisting ? "" : "*"}</label>
              <select
                value={profile.city}
                onChange={onCityChange}
                required={!isExisting}
                className="mt-1 block w-full rounded-lg border px-3 py-2 bg-white"
                style={{ borderColor: "#E6EAE6" }}
              >
                <option value="">{cityOptions.length ? "Select city" : "Pick province first"}</option>
                {cityOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-600">Shooting club (type)</label>
              <input
                value={profile.shooting_club}
                onChange={(e) => setField("shooting_club", e.target.value)}
                placeholder="Enter shooting club name"
                className="mt-1 block w-full rounded-lg border px-3 py-2"
                style={{ borderColor: "#E6EAE6" }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600">Phone</label>
              <input
                value={profile.phone}
                onChange={(e) => setField("phone", e.target.value)}
                className="mt-1 block w-full rounded-lg border px-3 py-2"
                style={{ borderColor: "#E6EAE6" }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600">Email</label>
              <input
                value={profile.email}
                onChange={(e) => setField("email", e.target.value)}
                className="mt-1 block w-full rounded-lg border px-3 py-2"
                style={{ borderColor: "#E6EAE6" }}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-600">Address</label>
              <input
                value={profile.address}
                onChange={(e) => setField("address", e.target.value)}
                className="mt-1 block w-full rounded-lg border px-3 py-2"
                style={{ borderColor: "#E6EAE6" }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600">Upload PDF 1</label>
              <input type="file" name="pdf1" accept="application/pdf" onChange={onFileChange} className="mt-1 block w-full text-sm text-gray-600" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600">Upload PDF 2</label>
              <input type="file" name="pdf2" accept="application/pdf" onChange={onFileChange} className="mt-1 block w-full text-sm text-gray-600" />
            </div>
          </div>

          {msg && (
            <div className="mt-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">
              {msg}
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg font-semibold shadow hover:scale-[1.01] transition-transform disabled:opacity-60"
              style={{ background: `linear-gradient(90deg, ${COLORS.magenta}, ${COLORS.pink})`, color: "#fff", border: "none" }}
            >
              {submitting ? (isExisting ? "Saving..." : "Creating...") : isExisting ? "Save Changes" : "Create Profile"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/applicant/dashboard")}
              className="px-4 py-2 rounded-lg border"
              style={{ borderColor: "#E6EAE6" }}
            >
              Cancel
            </button>

            <div className="ml-auto text-sm text-gray-500">
              <span className="font-medium">Tip:</span> keep your ID and photo clear for faster verification.
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
