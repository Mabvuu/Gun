// frontend/src/components/AdvanceButton.jsx
import React, { useState } from 'react';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';

/**
 * Props:
 * - application: full application object
 * - onAdvanced(updatedApplication) optional callback
 *
 * Note: this component checks locally that the user's role matches the expected phase.
 * It uses a small ROLE_TO_PHASE map (must match backend config).
 */

const ROLE_TO_PHASE = {
  moj: 'phase1_moj_flag',
  moj_flag: 'phase1_moj_flag',
  club: 'phase2_club',
  police: 'phase3_police',
  province: 'phase4_province',
  intelligence: 'phase5_intelligence',
  cfr: 'phase6_cfr',
  operator: 'phase7_operator'
};

export default function AdvanceButton({ application, onAdvanced }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!application) return null;
  if (!user || !user.role) return null;

  const allowedPhase = ROLE_TO_PHASE[user.role];
  // only show if user's role matches the app's current status
  if (!allowedPhase || application.status !== allowedPhase) return null;

  async function handleAdvance() {
    setError(null);
    const ok = window.confirm('Are you sure you want to move this application to the next step?');
    if (!ok) return;
    setLoading(true);
    try {
      // optional: collect a small comment. For simplicity use prompt.
      const comment = window.prompt('Optional comment for the history (leave empty to skip):', '') || '';
      const payload = { comment }; // you can extend with additions/documents
      const updated = await client.post(`/applications/${application._id}/advance`, payload);
      if (onAdvanced) onAdvanced(updated);
      alert('Application moved successfully.');
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || 'Failed to advance');
      alert(`Failed to advance: ${err?.response?.data?.error || err.message || 'Unknown'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        onClick={handleAdvance}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
      >
        {loading ? 'Moving…' : 'Stamp (Advance)'}
      </button>
      {error && <div className="text-red-600 mt-2">{error}</div>}
    </div>
  );
}
