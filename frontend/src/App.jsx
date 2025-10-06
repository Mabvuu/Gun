// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DealerRoutes from './Dealer/DealerRoutes';
import ApplicantsRoutes from './applicants/applicantsRoutes';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import OperatorLogin from './components/OperatorLogin';
import MOJRoutes from './MOJ';
import SportsClubRoutes from './Club';
import PoliceRoutes from './PoliceStation';
import ProvinceRoutes from './Province/ProvinceRoutes';
import INTELRoutes from './INTEL';
import CFRRoutes from './CFR';

export default function App() {
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        html, body, #root { width: 100%; overflow-x: hidden; -webkit-overflow-scrolling: touch; }
        img, picture, canvas, iframe, svg { max-width: 100%; height: auto; display: block; }
        .min-w-0 { min-width: 0; }
        body { overflow-y: auto; overflow-x: hidden; }
        .app-viewport { width: 100%; min-height: 100vh; overflow-x: hidden; overflow-y: auto; position: relative; }
      `}</style>

      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/admin/signup" element={<OperatorLogin />} />
          <Route path="/applicant/*" element={<ApplicantsRoutes />} />
          <Route path="/dealer/*" element={<DealerRoutes />} />
          <Route path="/moj/*" element={<MOJRoutes />} />
          <Route path="/club/*" element={<SportsClubRoutes />} />
          <Route path="/police/*" element={<PoliceRoutes />} />
          <Route path="/province/*" element={<ProvinceRoutes />} />
          <Route path="/int/*" element={<INTELRoutes />} />
          <Route path="/cfr/*" element={<CFRRoutes />} />
          <Route path="*" element={<div>Page not found</div>} />
        </Routes>
      </Router>
    </>
  );
}
