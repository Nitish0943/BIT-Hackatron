'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useApp } from '@/lib/store';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function VolunteerDashboardPage() {
  const { state, assignRequest, completeRequestById } = useApp();

  const me = useMemo(
    () => state.dashboard.volunteers.find((vol) => vol.phone === state.user.phone) ?? state.dashboard.volunteers[0],
    [state.dashboard.volunteers, state.user.phone],
  );

  const pending = useMemo(
    () => state.dashboard.requests.filter((req) => req.status === 'pending').slice(0, 12),
    [state.dashboard.requests],
  );

  const mine = useMemo(
    () => state.dashboard.requests.filter((req) => req.assignedVolunteerId === me?.id && req.status !== 'completed'),
    [state.dashboard.requests, me],
  );

  if (!me) return <div className="max-w-6xl mx-auto px-4 py-10">Loading dashboard...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-5">
      <section className="gov-card p-5">
        <h1 className="gov-title text-2xl">Volunteer Operations Dashboard</h1>
        <p className="text-sm text-slate-600 mt-1">Welcome, {me.name}. Manage nearby tasks from Jharkhand command network.</p>
      </section>

      <section className="grid lg:grid-cols-3 gap-4">
        <div className="gov-card p-4 lg:col-span-2">
          <h2 className="gov-title text-lg mb-3">Nearby Requests</h2>
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {pending.map((req) => (
              <div key={req.id} className="border border-slate-200 rounded-md p-3 text-sm flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{req.id} - {req.category}</p>
                  <p className="text-slate-500">{req.location} | Priority {req.priority}</p>
                </div>
                <button onClick={() => assignRequest(req.id, me.id)} className="px-3 py-1.5 rounded-md bg-[#0b3c5d] text-white">Accept</button>
              </div>
            ))}
          </div>
        </div>

        <div className="gov-card p-4">
          <h2 className="gov-title text-lg mb-3">My Active Tasks</h2>
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {mine.length === 0 && <p className="text-sm text-slate-500">No active tasks.</p>}
            {mine.map((req) => (
              <div key={req.id} className="border border-slate-200 rounded-md p-3 text-sm">
                <p className="font-semibold text-slate-800">{req.id}</p>
                <p className="text-slate-500">{req.location}</p>
                <button onClick={() => completeRequestById(req.id)} className="mt-2 px-3 py-1.5 rounded-md border border-[#0b3c5d] text-[#0b3c5d]">Complete</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="gov-card overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h2 className="gov-title text-lg">Jharkhand Task Map</h2>
        </div>
        <MapView requests={pending} volunteers={[me]} height="420px" showHeatmap showClusters />
      </section>
    </div>
  );
}
