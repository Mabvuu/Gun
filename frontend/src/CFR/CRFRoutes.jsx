// src/CFR/cfrRoutes.jsx
import React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import CFRNav from "./Nav";

// pages (make sure these paths match your actual files)
import Applicants from "./pages/applicant"; // src/CFR/pages/applicant.jsx
import Police from "./pages/police";       // src/CFR/pages/police.jsx
import Province from "./pages/province";   // src/CFR/pages/province.jsx
import INT from "./pages/int";             // src/CFR/pages/INT.jsx
import MOJ from "./pages/moj";             // src/CFR/pages/MOJ.jsx
import Club from "./pages/club";           // src/CFR/pages/Club.jsx

function CFRLayout() {
  return (
    <div className="min-h-screen flex">
      <CFRNav />
      <div style={{ width: 64, flexShrink: 0 }} /> {/* spacer to push content right of fixed nav */}
      <main className="flex-1 p-6" style={{ minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  );
}

export default function CFRRoutes() {
  return (
    <Routes>
      <Route path="/cfr" element={<CFRLayout />}>
        <Route index element={<Navigate to="applicants" replace />} />
        <Route path="applicants" element={<Applicants />} />
        <Route path="police" element={<Police />} />
        <Route path="province" element={<Province />} />
        <Route path="int" element={<INT />} />
        <Route path="moj" element={<MOJ />} />
        <Route path="clubs" element={<Club />} />
        <Route path="*" element={<Navigate to="applicants" replace />} />
      </Route>
    </Routes>
  );
}
