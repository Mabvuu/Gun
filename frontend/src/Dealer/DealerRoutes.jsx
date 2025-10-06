// frontend/src/Dealer/DealerRoutes.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Import the nav and dealer pages
import DealerNav from './Nav';
import Dashboard from './Pages/Dashboard';
import GunPage from './Pages/GunPage';
import MintGun from './Pages/MintGun';
import SalesQueue from './Pages/SalesQueue';
import Transfers from './Pages/Transfer';
import Audit from './Pages/Audit';
import DealerProfile from './components/DealerProfile';

// <- NEW imports
import Application from './Pages/Application';
import ApplicationsList from './Pages/ApplicationList';
import Notifications from './components/Notification';

export default function DealerRoutes() {
  return (
    <div className="flex">
      {/* Sidebar nav */}
      <DealerNav />

      {/* Main content */}
      <div className="flex-1">
        <Routes>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="gun/:id" element={<GunPage />} />
          <Route path="mint" element={<MintGun />} />
          <Route path="sales" element={<SalesQueue />} />
          <Route path="transfers" element={<Transfers />} />
          <Route path="audit" element={<Audit />} />
          <Route path="profile" element={<DealerProfile />} />
          <Route path="notifications" element={<Notifications />} />

          {/* Application routes */}
          {/* /dealer/apply?gunId=...  */}
          <Route path="apply" element={<Application />} />

          {/* /dealer/applications  - list of applications for dealer */}
          <Route path="applications" element={<ApplicationsList />} />
        </Routes>
      </div>
    </div>
  );
}
