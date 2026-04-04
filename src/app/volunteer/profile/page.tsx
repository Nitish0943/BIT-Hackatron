'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useApp } from '@/lib/store';

export default function VolunteerProfilePage() {
  const { state } = useApp();

  const volunteer = useMemo(
    () => state.dashboard.volunteers.find((vol) => vol.phone === state.user.phone) ?? state.dashboard.volunteers[0],
    [state.dashboard.volunteers, state.user.phone],
  );

  if (!volunteer) {
    return <div className="max-w-3xl mx-auto px-4 py-10">Loading volunteer profile...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="gov-card p-6 grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <img src={volunteer.image} alt={volunteer.name} className="w-40 h-40 rounded-md object-cover border border-slate-300" />
          <div className="mt-3 p-3 border border-slate-300 rounded-md bg-slate-50 text-sm">
            <p className="font-semibold text-[#0b3c5d]">Volunteer ID Card</p>
            <p>ID: {volunteer.idCard}</p>
            <p>Zone: {volunteer.zone}</p>
          </div>
        </div>
        <div className="md:col-span-2 space-y-2 text-sm text-slate-700">
          <h1 className="gov-title text-2xl">Volunteer Profile</h1>
          <p><strong>Name:</strong> {volunteer.name}</p>
          <p><strong>Phone:</strong> {volunteer.phone}</p>
          <p><strong>Skills:</strong> {volunteer.skills.join(', ')}</p>
          <p><strong>Vehicle:</strong> {volunteer.vehicle ? 'Available' : 'Not available'}</p>
          <p><strong>Availability:</strong> {volunteer.availability}</p>
          <p><strong>Tasks Completed:</strong> {volunteer.tasksCompleted}</p>
          <Link href="/volunteer/dashboard" className="inline-block mt-3 px-4 py-2 rounded-md bg-[#0b3c5d] text-white no-underline">Open Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
