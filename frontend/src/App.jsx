// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import route groups
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
    <Router>
      <Routes>
        {/* Login page */}
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/admin/signup" element={<OperatorLogin />} />

        {/* Applicants section */}
        <Route path="/applicant/*" element={<ApplicantsRoutes />} />

        {/* Dealer section (all dealer routes handled inside DealerRoutes) */}
        <Route path="/dealer/*" element={<DealerRoutes />} />

        {/* MOJ Dashboard (this is where the MOJ Routes are) */}
        <Route path="/moj/*" element={<MOJRoutes />} />

        {/* Sportclub Dashboard (this is where the Sportclub Routes are) */}
        <Route path="/club/*" element={<SportsClubRoutes />} />

        {/*Police Dashboard (this is where the Police Routes are) */}
        <Route path="/police/*" element={<PoliceRoutes />} />

        {/*Province Dashboard (this is where the Province Routes are) */}
        <Route path="/province/*" element={<ProvinceRoutes />} />

         {/*INTELLIGENCE Dashboard (this is where the INT Routes are) */}
        <Route path="/int/*" element={<INTELRoutes />} />

        <Route path="/cfr/*" element={<CFRRoutes />} />


        {/* 404 fallback */}
        <Route path="*" element={<div>Page not found</div>} />
      </Routes>
    </Router>
  );
}
