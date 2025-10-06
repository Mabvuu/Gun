// src/Province/ProvinceRoutes.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Nav from './Nav';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import Audit from './pages/Audit';
import Notifications from './pages/Notification';
import Province from './pages/ProvinceRecieve';

export default function ProvinceRoutes() {
  return (
    <>
      {/* fixed left nav */}
      <Nav />

      {/* main content shifted right by nav width (w-64 -> ml-64) */}
      <main className="ml-64  ">
        <Routes>
          {/* when /province hit, redirect to /province/dashboard */}
          <Route path="/" element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="reports" element={<Reports />} />
          <Route path="audit" element={<Audit />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="receive" element={<Province />} />
        </Routes>
      </main>
    </>
  );
}
