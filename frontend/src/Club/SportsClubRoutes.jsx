// src/Club/ClubRoutes.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ClubNav from './Nav';

// pages (adjust paths if your pages live in a different folder)
import ClubDashboard from './pages/Dashboard';
import UploadMembership from './pages/UploadMembership';
import AttendanceLog from './pages/AttendanceLog';
import View from './pages/View';
import Notifications from './pages/Notifications';
import DocList from './components/DocList';
import ClubReceive from './pages/clubRecieve';

export default function ClubRoutes() {
  return (
    <div className="flex">
      {/* left sidebar nav */}
      <ClubNav />

      {/* main content */}
      <div className="ml-64">
        <Routes>
          <Route path="dashboard" element={<ClubDashboard />} />
          <Route path="members" element={<DocList/>} />
          <Route path="upload-membership" element={<UploadMembership />} />
          <Route path="attendance" element={<AttendanceLog />} />
          <Route path="view" element={<View />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="receive" element={<ClubReceive/>} />

          {/* default /club -> dashboard */}
          <Route path="" element={<Navigate to="dashboard" replace />} />

          <Route path="*" element={<div className="p-35">Page not found</div>} />
        </Routes>
      </div>
    </div>
  );
}
