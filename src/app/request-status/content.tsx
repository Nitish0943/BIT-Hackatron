'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/lib/store';

export default function RequestStatusContent() {
  const searchParams = useSearchParams();
  const { state } = useApp();
  const [query, setQuery] = useState(searchParams?.get('id') ?? '');
  const [searched, setSearched] = useState(false);

  const result = state.dashboard.requests.find(
    (req) => req.id.toUpperCase() === query.trim().toUpperCase() || req.phone === query.trim(),
  );

  useEffect(() => {
    const id = searchParams?.get('id');
    if (id) {
      setQuery(id);
      setSearched(true);
    }
  }, [searchParams]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <div className="gov-card p-5">
        <h1 className="gov-title text-xl">Track Request</h1>
        <p className="text-sm text-slate-600 mt-1">Search with request ID or phone number.</p>
        <div className="flex gap-2 mt-3">
          <input className="flex-1 border border-slate-300 rounded-md px-3 py-2" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button onClick={() => setSearched(true)} className="px-4 py-2 rounded-md bg-[#0b3c5d] text-white">Search</button>
        </div>
      </div>

      {searched && !result && (
        <div className="gov-card p-5 text-sm text-slate-600">No request found.</div>
      )}

      {searched && result && (
        <div className="gov-card p-5 space-y-2 text-sm text-slate-700">
          <h2 className="gov-title text-lg">{result.id}</h2>
          <p><strong>Name:</strong> {result.name}</p>
          <p><strong>Category:</strong> {result.category}</p>
          <p><strong>Status:</strong> {result.status}</p>
          <p><strong>People:</strong> {result.people}</p>
          <p><strong>Location:</strong> {result.location}</p>
          <p><strong>Zone:</strong> {result.zone}</p>
          <p><strong>Assigned Volunteer:</strong> {result.assignedVolunteerName || 'Not assigned yet'}</p>
        </div>
      )}
    </div>
  );
}
