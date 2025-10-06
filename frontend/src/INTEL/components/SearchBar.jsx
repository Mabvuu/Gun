import React, { useState } from 'react';

export default function SearchBar({ onSearch }) {
  const [q, setQ] = useState('');
  const [nid, setNid] = useState('');
  const [serial, setSerial] = useState('');
  const [region, setRegion] = useState('');

  const submit = (e) => {
    e?.preventDefault();
    onSearch({ q: q.trim(), nationalId: nid.trim(), serial: serial.trim(), region: region.trim() });
  };

  return (
    <form onSubmit={submit} className="bg-white p-4 rounded shadow-sm grid grid-cols-1 gap-3 md:grid-cols-4">
      <input
        className="border rounded p-2"
        placeholder="Free text"
        value={q}
        onChange={e => setQ(e.target.value)}
      />
      <input
        className="border rounded p-2"
        placeholder="National ID"
        value={nid}
        onChange={e => setNid(e.target.value)}
      />
      <input
        className="border rounded p-2"
        placeholder="Serial"
        value={serial}
        onChange={e => setSerial(e.target.value)}
      />
      <div className="flex gap-2">
        <input
          className="border rounded p-2 flex-1"
          placeholder="Region"
          value={region}
          onChange={e => setRegion(e.target.value)}
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Search
        </button>
      </div>
    </form>
  );
}
