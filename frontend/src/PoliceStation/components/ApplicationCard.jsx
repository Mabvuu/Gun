import React from 'react';
import { Link } from 'react-router-dom';

export default function ApplicationCard({ app }) {
  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: 6,
      padding: 12,
      marginBottom: 12,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div>
        <div><strong>Applicant:</strong> {app.applicantName}</div>
        <div><strong>Gun Serial:</strong> ****{app.gunSerial.slice(-4)}</div>
        <div><small>Assigned to station: {app.station}</small></div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Link to={`/police/application/${app.id}`}><button>Open</button></Link>
      </div>
    </div>
  );
}
