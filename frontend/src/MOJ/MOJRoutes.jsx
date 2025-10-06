// frontend/src/MOJ/MOJRoutes.jsx
import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Sidebar nav + pages
import MOJNav from './components/Nav';
import MOJDashboard from './pages/MOJDashboard';
import Profile from './pages/Profile';
import MojReceive from './pages/MOJRecieve';

function SafeIndexRedirect() {
  const loc = useLocation();
  // If user is exactly on the MOJ base path (e.g. /moj or /moj/) then redirect once to dashboard.
  if (loc.pathname.endsWith('/moj') || loc.pathname.endsWith('/moj/')) {
    return <Navigate to="dashboard" replace />;
  }
  return null;
}

function SafeWildcardRedirect() {
  const loc = useLocation();
  // If already on a valid child path, do nothing (prevents redirect loops).
  if (loc.pathname.endsWith('/dashboard') || loc.pathname.endsWith('/receive') || loc.pathname.endsWith('/profile')) {
    return null;
  }
  // Otherwise redirect to dashboard
  return <Navigate to="dashboard" replace />;
}

export default function MOJRoutes() {
  return (
    <div className="flex">
      {/* Sidebar nav */}
      <MOJNav />

      {/* Main content */}
      <div className="flex-1">
        <Routes>
          {/* When mounted at /moj/* this empty path handles the index */}
          <Route path="" element={<SafeIndexRedirect />} />

          <Route path="dashboard" element={<MOJDashboard />} />
          <Route path="receive" element={<MojReceive />} />
          <Route path="profile" element={<Profile />} />

          {/* Catch-all for unknown nested routes under /moj */}
          <Route path="*" element={<SafeWildcardRedirect />} />
        </Routes>
      </div>
    </div>
  );
}
