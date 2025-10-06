// src/Intel/INTELRoutes.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import Nav from './Nav';
import Dashboard from './pages/Dashboard';
import RecordView from './pages/RecordView';
import Analytics from './pages/Analytics';
import Annotate from './pages/Annotate';
import IntReceive from './pages/intReceiver';

export default function INTELRoutes() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Nav />
      <main style={{ flex: 1, padding: 24 }}>
        <Routes>
          <Route path="/" element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="record/:id" element={<RecordView />} />
          <Route path="receive/:id" element={<IntReceive />} />
          <Route path="annotate/:id" element={<Annotate />} />
          <Route path="analytics" element={<Analytics />} />
        </Routes>
      </main>
    </div>
  );
}
