import React from 'react';
import { Link } from 'react-router-dom';

export default function MemberCard({ member }) {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm flex items-center justify-between">
      <div>
        <div className="font-semibold">{member.name}</div>
        <div className="text-sm text-gray-500">ID: {member.id}</div>
        <div className="text-sm text-gray-500">Status: {member.status}</div>
      </div>
      <div className="flex gap-2">
        <Link to={`/sportsclub/view?memberId=${member.id}`}>
          <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Open</button>
        </Link>
      </div>
    </div>
  );
}
