'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import RequestCard from '@/components/RequestCard';
import { priorityLabel, explainPriority, mergeMessage } from '@/lib/aiLogic';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dx = (a.lat - b.lat) * 111;
  const dy = (a.lng - b.lng) * 111 * Math.cos((a.lat * Math.PI) / 180);
  return Math.sqrt(dx * dx + dy * dy);
}

export default function VolunteerDashboardPage() {
  const router = useRouter();
  const { state, assignRequest, completeRequestById, logout } = useApp();

  const handleLogout = () => {
    logout();
    localStorage.clear();
    router.push('/login');
  };

  const me = useMemo(
    () => state.dashboard.volunteers.find((vol) => vol.phone === state.user.phone) ?? state.dashboard.volunteers[0],
    [state.dashboard.volunteers, state.user.phone],
  );

  const pending = useMemo(
    () => state.dashboard.requests.filter((req) => req.status === 'pending'),
    [state.dashboard.requests],
  );

  const relevantPending = useMemo(
    () => pending
      .slice()
      .sort((a, b) => distanceKm(me, a) - distanceKm(me, b))
      .slice(0, 10),
    [me, pending],
  );

  const mine = useMemo(
    () => state.dashboard.requests.filter((req) => req.assignedVolunteerId === me?.id && req.status !== 'completed'),
    [state.dashboard.requests, me],
  );

  if (!me) return <div className="max-w-6xl mx-auto px-4 py-10">Loading dashboard...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-5">
      <section className="gov-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="gov-title text-2xl">Volunteer Operations Dashboard</h1>
            <p className="text-sm text-slate-600 mt-1">Welcome, {me.name}. Manage nearby tasks from Jharkhand command network.</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            Logout
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
          <span className="px-2 py-1 rounded-full bg-slate-100">Tasks update live every few seconds</span>
          <span className="px-2 py-1 rounded-full bg-green-100 text-green-700">Assigned tasks sync instantly</span>
        </div>
      </section>

      <section className="grid lg:grid-cols-3 gap-4">
        <div className="gov-card p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="gov-title text-lg">Relevant Tasks</h2>
            <div className="text-xs text-slate-500">Sorted by distance from your location</div>
          </div>
          <div className="space-y-3 max-h-130 overflow-y-auto pr-1">
            {relevantPending.map((req) => {
              const km = distanceKm(me, req).toFixed(1);
              const navLink = `https://www.google.com/maps?q=${req.lat},${req.lng}`;
              return (
                <div key={req.id} className="space-y-2">
                  <RequestCard request={req} onAssign={() => assignRequest(req.id, me.id)} />
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`px-2 py-1 rounded-full ${priorityLabel(req.priority) === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {priorityLabel(req.priority)}
                    </span>
                    <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700">{km} km away</span>
                    <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700">{explainPriority(req)}</span>
                    {mergeMessage(req) && <span className="px-2 py-1 rounded-full bg-green-50 text-green-700">{mergeMessage(req)}</span>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => assignRequest(req.id, me.id)} className="px-3 py-1.5 rounded-md bg-[#0b3c5d] text-white text-xs">Accept</button>
                    <a href={navLink} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-md border border-[#0b3c5d] text-[#0b3c5d] text-xs no-underline">Open Navigation</a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="gov-card p-4">
          <h2 className="gov-title text-lg mb-3">My Active Tasks</h2>
          <div className="space-y-2 max-h-105 overflow-y-auto">
            {mine.length === 0 && <p className="text-sm text-slate-500">No active tasks.</p>}
            {mine.map((req) => (
              <div key={req.id} className="border border-slate-200 rounded-md p-3 text-sm space-y-2">
                <p className="font-semibold text-slate-800">{req.id}</p>
                <p className="text-slate-500">{req.location}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 rounded-full bg-slate-100">{priorityLabel(req.priority)}</span>
                  <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700">Source: {req.source ? req.source.replace('_', ' ').toUpperCase() : 'WEB'}</span>
                  {req.eta && <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700">ETA {req.eta}</span>}
                </div>
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
