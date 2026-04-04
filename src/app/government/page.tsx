'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useApp } from '@/lib/store';
import { predictDepletion, suggestNearestVolunteer } from '@/lib/aiLogic';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function GovernmentPage() {
  const { state, assignRequest, changePriority, broadcastAlert } = useApp();
  const [alertText, setAlertText] = useState('');

  const activeRequests = useMemo(
    () => state.dashboard.requests.filter((req) => req.status !== 'completed'),
    [state.dashboard.requests],
  );

  const forecasts = useMemo(() => predictDepletion(state.dashboard.resources), [state.dashboard.resources]);

  const assignNearest = async (requestId: string) => {
    const req = state.dashboard.requests.find((item) => item.id === requestId);
    if (!req) return;
    const nearest = suggestNearestVolunteer(req, state.dashboard.volunteers);
    if (!nearest) return;
    await assignRequest(requestId, nearest.id);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-5">
      <section className="gov-card p-5">
        <h1 className="gov-title text-2xl">Government Control Dashboard</h1>
        <p className="text-sm text-slate-600 mt-1">Jharkhand district command view with satellite map, heat density, and cluster monitoring.</p>
        <div className="grid md:grid-cols-4 gap-3 mt-4 text-center">
          <div className="gov-section p-3"><p className="text-xs text-slate-500">Active Requests</p><p className="text-2xl font-bold text-[#0b3c5d]">{state.dashboard.summary.activeRequests}</p></div>
          <div className="gov-section p-3"><p className="text-xs text-slate-500">Critical</p><p className="text-2xl font-bold text-red-700">{state.dashboard.summary.criticalRequests}</p></div>
          <div className="gov-section p-3"><p className="text-xs text-slate-500">Completed</p><p className="text-2xl font-bold text-green-700">{state.dashboard.summary.completedRequests}</p></div>
          <div className="gov-section p-3"><p className="text-xs text-slate-500">Volunteers Available</p><p className="text-2xl font-bold text-[#0b3c5d]">{state.dashboard.summary.volunteersAvailable}</p></div>
        </div>
      </section>

      <section className="gov-card overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="gov-title text-lg">Jharkhand Satellite Operations Map</h2>
          <div className="text-xs text-slate-500">Red: High | Yellow: Medium | Green: Low</div>
        </div>
        <MapView requests={state.dashboard.requests} volunteers={state.dashboard.volunteers} height="480px" showHeatmap showClusters />
      </section>

      <section className="grid lg:grid-cols-4 gap-4">
        <div className="gov-card p-4 lg:col-span-2">
          <h2 className="gov-title text-lg mb-3">Active Requests</h2>
          <div className="space-y-2 max-h-[360px] overflow-y-auto">
            {activeRequests.slice(0, 20).map((req) => (
              <div key={req.id} className="border border-slate-200 rounded-md p-3 text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-800">{req.id} - {req.category}</p>
                  <span className="text-xs px-2 py-1 rounded bg-slate-100">{req.status}</span>
                </div>
                <p className="text-slate-500">{req.location} | Priority {req.priority}</p>
                <div className="flex gap-2">
                  <button onClick={() => assignNearest(req.id)} className="px-2 py-1 rounded border border-[#0b3c5d] text-[#0b3c5d]">Assign Nearest</button>
                  <button onClick={() => changePriority(req.id, req.priority + 5)} className="px-2 py-1 rounded border border-amber-600 text-amber-700">Raise Priority</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="gov-card p-4">
          <h2 className="gov-title text-lg mb-3">Resource Status</h2>
          <div className="space-y-2">
            {forecasts.map((item) => (
              <div key={item.resourceName} className="border border-slate-200 rounded-md p-2 text-sm">
                <p className="font-medium text-slate-800">{item.resourceName}</p>
                <p className="text-slate-500">{item.available} / {item.total}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="gov-card p-4 space-y-3">
          <h2 className="gov-title text-lg">Alerts</h2>
          <textarea className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" rows={3} value={alertText} onChange={(e) => setAlertText(e.target.value)} placeholder="Broadcast alert to all portals" />
          <button onClick={() => { broadcastAlert(alertText); setAlertText(''); }} className="w-full px-3 py-2 rounded-md bg-[#0b3c5d] text-white">Broadcast Alert</button>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {state.dashboard.alerts.map((item, index) => (
              <div key={`${item}-${index}`} className="text-xs p-2 rounded bg-slate-50 border border-slate-200 text-slate-700">{item}</div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
