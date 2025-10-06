import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ScanVerify from './pages/ScanVerify';
import VerifyLog from './pages/VerifyLog';

export default function OfficerRoutes() {
  return (
    <Routes>
      <Route path="/scan" element={<ScanVerify />} />
      <Route path="/log" element={<VerifyLog />} />
    </Routes>
  );
}
