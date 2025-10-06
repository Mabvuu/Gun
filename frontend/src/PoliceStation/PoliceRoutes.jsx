// src/PoliceStation/PoliceRoutes.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Nav from './Nav';
import Inspections from './pages/Inspections';
import StationRoster from './pages/StationRoster';
import Audit from './pages/Audit';
import Notifications from './pages/Notifications';
import PoliceDashboard from './pages/PoliceDashboard';
import PoliceReceive from './pages/PoliceReceive';

export default function PoliceRoutes() {
  return (
    <>
      {/* Nav is fixed to the left (w-60). Keep it mounted so its canvas continues rendering. */}
      <Nav />

      {/* Main content — shifted right by the nav width (ml-60).
          - p-6: padding
          - min-h-screen: ensures background covers full height
          - bg-slate-50: optional, change or remove to match your app
      */}
      <main className="ml-60 ">
        <Routes>
          <Route path="/" element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<PoliceDashboard />} />
          <Route path="receive" element={<PoliceReceive />} />
          <Route path="inspections" element={<Inspections />} />
          <Route path="roster" element={<StationRoster />} />
          <Route path="audit" element={<Audit />} />
          <Route path="notifications" element={<Notifications />} />
        </Routes>
      </main>
    </>
  );
}
