'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/lib/store';
import { predictDepletion, findNearestVolunteer } from '@/lib/aiLogic';
import ResourceGauge from '@/components/ResourceGauge';
import MultiChannelPanel from '@/components/MultiChannelPanel';
import RequestCard from '@/components/RequestCard';
import dynamic from 'next/dynamic';
import {
  Bell, Users, AlertTriangle, Package, ChevronRight, Filter,
  Radio, Zap, TrendingDown, X, CheckCircle
} from 'lucide-react';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function AdminDashboardPage() {
  const { state, assignVolunteer, broadcastAlert, updateStatus } = useApp();
  const [alertText, setAlertText] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [assignModal, setAssignModal] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'requests' | 'resources' | 'multichannel'>('requests');

  const forecasts = useMemo(() => predictDepletion(state.resources), [state.resources]);

  const filteredRequests = useMemo(() => {
    return state.requests
      .filter(r => filterCat === 'all' || r.category === filterCat)
      .filter(r => filterStatus === 'all' || r.status === filterStatus)
      .sort((a, b) => b.priority - a.priority);
  }, [state.requests, filterCat, filterStatus]);

  const stats = useMemo(() => ({
    total: state.requests.length,
    pending: state.requests.filter(r => r.status === 'pending').length,
    assigned: state.requests.filter(r => r.status === 'assigned').length,
    completed: state.requests.filter(r => r.status === 'completed').length,
    volunteers: state.volunteers.filter(v => v.status === 'available').length,
    critical: state.requests.filter(r => r.priority >= 60 && r.status === 'pending').length,
  }), [state.requests, state.volunteers]);

  const urgentForecasts = forecasts.filter(f => f.isUrgent);

  const handleBroadcast = () => {
    if (!alertText.trim()) return;
    broadcastAlert(alertText.trim());
    setAlertText('');
  };

  const handleAutoAssign = (reqId: string) => {
    const req = state.requests.find(r => r.id === reqId);
    if (!req) return;
    const nearest = findNearestVolunteer(req, state.volunteers);
    if (nearest) {
      assignVolunteer(reqId, nearest.id);
      setAssignModal(null);
    }
  };

  const SOURCE_COLORS: Record<string, string> = {
    web: '#6366f1', ivr: '#d97706', missed_call: '#dc2626', whatsapp: '#16a34a', drone: '#0891b2',
  };

  const sourceStats = useMemo(() => {
    const map: Record<string, number> = { web: 0, ivr: 0, missed_call: 0, whatsapp: 0, drone: 0 };
    state.requests.forEach(r => { map[r.source] = (map[r.source] || 0) + 1; });
    return map;
  }, [state.requests]);

  return (
    <div className="min-h-screen" style={{ background: '#f0f4f8' }}>
      {/* Control Room Header */}
      <div style={{ background: 'linear-gradient(135deg,#0a1628,#112240)' }} className="px-4 py-5">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="pulse-dot"></span>
                <span className="text-green-400 text-xs font-bold uppercase tracking-widest">Control Room Active</span>
              </div>
              <h1 className="text-2xl font-black text-white mt-1">Admin / NGO Dashboard</h1>
              <p className="text-blue-300 text-xs mt-1">SahayakNet Disaster Coordination — Flood Scenario, Chennai</p>
            </div>
            <div className="flex items-center gap-2">
              {urgentForecasts.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#7f1d1d55', border: '1px solid #dc2626' }}>
                  <AlertTriangle size={14} className="text-red-400" />
                  <span className="text-red-300 text-xs font-bold">{urgentForecasts.length} Resources Critical</span>
                </div>
              )}
            </div>
          </div>

          {/* Top stat bar */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-5">
            {[
              { label: 'Total Requests', v: stats.total, color: '#93c5fd' },
              { label: 'Pending', v: stats.pending, color: '#fbbf24' },
              { label: 'Assigned', v: stats.assigned, color: '#60a5fa' },
              { label: 'Completed', v: stats.completed, color: '#4ade80' },
              { label: 'Critical', v: stats.critical, color: '#f87171' },
              { label: 'Volunteers Free', v: stats.volunteers, color: '#34d399' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-black" style={{ color: s.color }}>{s.v}</div>
                <div className="text-xs text-blue-300">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-5">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* Left: Map */}
          <div className="xl:col-span-2 space-y-5">
            {/* Map */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
              <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
                <div className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  🗺️ Live Disaster Map
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Heatmap ON</span>
                </div>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span>🔴 Medical</span><span>🟠 Rescue</span><span>🔵 Food</span><span>🟢 Volunteers</span>
                </div>
              </div>
              <MapView
                requests={state.requests}
                volunteers={state.volunteers.filter(v => v.status !== 'offline')}
                height="420px"
                showHeatmap
              />
            </div>

            {/* Source breakdown */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="font-bold text-gray-800 text-sm mb-3">📡 Requests by Channel</div>
              <div className="grid grid-cols-5 gap-3">
                {Object.entries(sourceStats).map(([src, count]) => (
                  <div key={src} className="text-center rounded-xl p-3" style={{ background: SOURCE_COLORS[src] + '18', border: `1px solid ${SOURCE_COLORS[src]}44` }}>
                    <div className="text-xl font-black" style={{ color: SOURCE_COLORS[src] }}>{count}</div>
                    <div className="text-xs text-gray-600 capitalize">{src.replace('_', ' ')}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Alerts broadcast */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
                <Radio size={15} className="text-red-500" /> Broadcast Alert
              </div>
              <div className="flex gap-3 mb-4">
                <input
                  className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-red-500 outline-none"
                  placeholder="Type emergency broadcast message..."
                  value={alertText}
                  onChange={e => setAlertText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleBroadcast()}
                />
                <button onClick={handleBroadcast}
                  className="px-5 py-2.5 rounded-xl text-white font-bold text-sm"
                  style={{ background: '#dc2626' }}>
                  SEND
                </button>
              </div>
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {state.alerts.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-lg bg-red-50 border border-red-100">
                    <AlertTriangle size={12} className="text-red-500 mt-0.5 shrink-0" />
                    <span className="text-red-700">{a}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Panel switcher */}
            <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
              {[
                { id: 'requests', label: 'Requests', icon: '📋' },
                { id: 'resources', label: 'Resources', icon: '📦' },
                { id: 'multichannel', label: 'Channels', icon: '📡' },
              ].map(p => (
                <button key={p.id} onClick={() => setActivePanel(p.id as any)}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all ${
                    activePanel === p.id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}>
                  {p.icon} {p.label}
                </button>
              ))}
            </div>

            {/* REQUESTS panel */}
            {activePanel === 'requests' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="p-4 border-b border-gray-100">
                  <div className="font-bold text-gray-800 text-sm mb-3">Active Requests</div>
                  <div className="flex gap-2 flex-wrap">
                    {['all', 'pending', 'assigned', 'completed'].map(s => (
                      <button key={s} onClick={() => setFilterStatus(s)}
                        className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                          filterStatus === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                        }`}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-3 space-y-2 max-h-[520px] overflow-y-auto">
                  {filteredRequests.slice(0, 20).map(req => (
                    <RequestCard
                      key={req.id}
                      request={req}
                      onAssign={req.status === 'pending' ? () => setAssignModal(req.id) : undefined}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* RESOURCES panel */}
            {activePanel === 'resources' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="font-bold text-gray-800 text-sm mb-2 flex items-center gap-2">
                  <Package size={14} className="text-blue-600" /> Resource Tracker
                </div>
                {urgentForecasts.length > 0 && (
                  <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200">
                    <div className="text-xs font-bold text-red-700 mb-1">⚠️ AI Prediction Alert</div>
                    {urgentForecasts.map(f => (
                      <div key={f.resourceName} className="text-xs text-red-600">
                        {f.resourceName} depletes in <strong>{f.daysUntilDepletion}d</strong>
                      </div>
                    ))}
                  </div>
                )}
                <ResourceGauge resources={state.resources} forecasts={forecasts} />

                {/* Volunteer availability */}
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <div className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
                    <Users size={14} className="text-green-600" /> Volunteer Status
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: 'Available', count: state.volunteers.filter(v => v.status === 'available').length, color: '#16a34a' },
                      { label: 'Busy', count: state.volunteers.filter(v => v.status === 'busy').length, color: '#d97706' },
                      { label: 'Offline', count: state.volunteers.filter(v => v.status === 'offline').length, color: '#9ca3af' },
                    ].map(s => (
                      <div key={s.label} className="rounded-xl p-3" style={{ background: s.color + '18' }}>
                        <div className="text-2xl font-black" style={{ color: s.color }}>{s.count}</div>
                        <div className="text-xs text-gray-600">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                    {state.volunteers.slice(0, 10).map(v => (
                      <div key={v.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-gray-50">
                        <span className="font-medium text-gray-700">{v.name}</span>
                        <span className={`px-2 py-0.5 rounded-full font-bold ${
                          v.status === 'available' ? 'bg-green-100 text-green-700' :
                          v.status === 'busy' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {v.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* MULTICHANNEL panel */}
            {activePanel === 'multichannel' && <MultiChannelPanel />}
          </div>
        </div>
      </div>

      {/* Assign Volunteer Modal */}
      {assignModal && (() => {
        const req = state.requests.find(r => r.id === assignModal);
        const nearest = req ? findNearestVolunteer(req, state.volunteers) : null;
        const availableVols = state.volunteers.filter(v => v.status === 'available');
        return req ? (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="font-black text-gray-800 text-lg">Assign Volunteer</div>
                  <div className="text-sm text-gray-500">Request {req.id} — {req.name}</div>
                </div>
                <button onClick={() => setAssignModal(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              {nearest && (
                <div className="rounded-xl p-4 mb-4 border-2 border-green-300 bg-green-50">
                  <div className="text-xs font-bold text-green-700 mb-2">🤖 AI Suggested (Nearest)</div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-800">{nearest.name}</div>
                      <div className="text-xs text-gray-600">{nearest.skills.join(', ')}</div>
                      <div className="text-xs text-gray-500">Zone: {nearest.zone}</div>
                    </div>
                    <button onClick={() => handleAutoAssign(assignModal)}
                      className="px-4 py-2 rounded-xl text-white text-sm font-bold"
                      style={{ background: '#16a34a' }}>
                      Auto-Assign
                    </button>
                  </div>
                </div>
              )}

              <div className="font-bold text-gray-700 text-sm mb-2">All Available Volunteers</div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {availableVols.map(v => (
                  <div key={v.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
                    <div>
                      <div className="font-semibold text-sm text-gray-800">{v.name}</div>
                      <div className="text-xs text-gray-500">{v.zone} | {v.skills.slice(0, 2).join(', ')}</div>
                    </div>
                    <button onClick={() => { assignVolunteer(assignModal, v.id); setAssignModal(null); }}
                      className="px-3 py-1.5 rounded-lg text-white text-xs font-bold"
                      style={{ background: '#1a3a6b' }}>
                      Assign
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null;
      })()}
    </div>
  );
}
