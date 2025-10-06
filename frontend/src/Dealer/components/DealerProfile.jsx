import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

export default function DealerProfile({ collapsed }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    axios.get("/api/dealer/profile")
      .then(res => { if (mounted) setProfile(res.data || null); })
      .catch(() => { if (mounted) setProfile(null); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  if (collapsed) {
    return (
      <div className="mt-4 p-2 text-xs text-white/90">
        <div className="text-center">D</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mt-4 px-3 py-3 bg-white/10 rounded text-sm text-white/80">
        Loading profile…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mt-4 px-3 py-3 bg-white/10 rounded text-sm text-white/90">
        <div className="font-medium">No profile</div>
        <div className="text-xs text-white/70">Add seller info</div>
        <Link to="/dealer/profile/edit" className="mt-2 inline-block text-xs underline">
          Add profile
        </Link>
      </div>
    );
  }

  const {
    firstName, lastName, phone, address,
    idNumber, passportNumber, dateOfBirth, nationality, licenseNumber, notes, email
  } = profile;

  return (
    <div className="mt-4 px-3 py-3 bg-white/10 rounded text-sm text-white/90">
      <div className="font-semibold">{(firstName || lastName) ? `${firstName || ""} ${lastName || ""}`.trim() : "Unnamed"}</div>

      <div className="text-[12px] text-white/70 mt-1">
        {phone && <div>📞 {phone}</div>}
        {address && <div className="truncate">📍 {address}</div>}
        {idNumber && <div>ID: {idNumber}</div>}
        {passportNumber && <div>Passport: {passportNumber}</div>}
        {licenseNumber && <div>License: {licenseNumber}</div>}
        {dateOfBirth && <div>DoB: {dateOfBirth}</div>}
        {nationality && <div>Nationality: {nationality}</div>}
      </div>

      {/* used notes so eslint no-unused-vars goes away */}
      {notes && <div className="mt-2 text-xs text-white/70">Notes: {notes}</div>}

      {(!idNumber && !passportNumber) && (
        <div className="mt-2 text-[11px] text-yellow-200">Warning: No ID/passport on file — verify before purchase.</div>
      )}

      <div className="mt-3 flex gap-2">
        <Link to="/dealer/profile/edit" className="text-xs bg-white/10 px-2 py-1 rounded hover:bg-white/20">Edit</Link>
        {email && <a href={`mailto:${email}`} className="text-xs bg-white/10 px-2 py-1 rounded hover:bg-white/20">Email</a>}
      </div>
    </div>
  );
}
