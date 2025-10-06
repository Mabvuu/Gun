// frontend/src/pages/roles/rolesView.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../../api/client';
import ApplicationDetails from '../../components/ApplicationDetails';
import AdvanceButton from '../../components/AdvanceButton';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Shared RoleView page.
 * Accepts optional prop `role` (string). If provided, that role is used;
 * otherwise it uses the `:role` param from the URL.
 *
 * Use it directly as a route `/:role/view/:id` (then no prop needed),
 * or import it inside per-role files and pass role="moj".
 */
export default function RoleView({ role: roleProp }) {
  const params = useParams(); // may contain { role, id } depending on route
  const roleFromUrl = params.role;
  const id = params.id;
  const role = roleProp || roleFromUrl || ''; // final role string

  const navigate = useNavigate();
  const { user } = useAuth();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!id) {
      setErr('Missing application id');
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    client.get(`/applications/${id}`)
      .then(data => { if (mounted) { setApplication(data); setErr(null); } })
      .catch(e => { console.error(e); if (mounted) setErr(e?.response?.data?.error || e.message); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [id]);

  if (loading) return <div className="p-4">Loading…</div>;
  if (err) return <div className="p-4 text-red-600">Error: {err}</div>;
  if (!application) return <div className="p-4">Application not found</div>;

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center gap-4">
        {/* Use role variable so wrappers that pass roleProp work */}
        <button onClick={() => navigate(role ? `/${role}` : -1)} className="px-3 py-1 border rounded">
          Back{role ? ` to ${role}` : ''}
        </button>
        <div className="text-sm text-gray-600">
          Signed in as: <strong>{user?.name || user?.role || 'unknown'}</strong>
        </div>
      </div>

      <ApplicationDetails application={application} />

      <AdvanceButton
        application={application}
        onAdvanced={(updated) => setApplication(updated)}
      />
    </div>
  );
}
