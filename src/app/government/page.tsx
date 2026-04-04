'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/lib/store';
import { MOCK_DISTRICTS } from '@/lib/mockData';
import { predictDepletion } from '@/lib/aiLogic';
import dynamic from 'next/dynamic';
import { Shield, AlertTriangle, TrendingUp, Zap, Map, BarChart3 } from 'lucide-react';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function GovernmentPage() {
  const { state, broadcastAlert } = useApp();
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [activeView, setActiveView] = useState<'map' | 'analytics'>('map');

  const forecasts = useMemo(() => predictDepletion(state.resources), [state.resources]);

  const totalRequests = state.requests.length;
  const resolvedPct = Math.round((state.requests.filter(r => r.status === 'completed').length / totalRequests) * 100);
  const criticalRequests = state.requests.filter(r => r.priority >= 60 && r.status === 'pending');

  const handleEmergencyOverride = () => {
    setEmergencyMode(e => !e);
    if (!emergencyMode) {
      broadcastAlert('🚨 GOVERNMENT EMERGENCY OVERRIDE ACTIVATED – All resources redirected to critical zones');
    }
  };

  const zoneSummary = useMemo(() => {
    const zones: Record<string, { requests: number; completed: number; critical: number }> = {};
    state.requests.forEach(r => {
      if (!zones[r.zone]) zones[r.zone] = { requests: 0, completed: 0, critical: 0 };
      zones[r.zone].requests++;
      if (r.status === 'completed') zones[r.zone].completed++;
      if (r.priority >= 60 && r.status === 'pending') zones[r.zone].critical++;
    });
    return zones;
  }, [state.requests]);

  const categoryBreakdown = useMemo(() => {
    const cats: Record<string, number> = { medical: 0, rescue: 0, food: 0, water: 0, shelter: 0 };
    state.requests.forEach(r => { cats[r.category]++; });
    return cats;
  }, [state.requests]);

  const CAT_ICONS: Record<string, string> = {
    medical: '🏥', rescue: '🚨', food: '🍱', water: '💧', shelter: '🏠',
  };

  return (
    <div className={`min-h-screen ${emergencyMode ? 'emergency-mode' : ''}`} style={{ background: emergencyMode ? '#0a1628' : '#f0f4f8' }}>
      {/* Header */}
      <div style={{ background: emergencyMode ? '#7f1d1d' : 'linear-gradient(135deg,#0a1628,#112240)', transition: 'background 0.5s' }} className="px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield size={16} className="text-blue-300" />
                <span className="text-blue-300 text-xs font-bold uppercase tracking-widest">Government Control View</span>
              </div>
              <h1 className="text-3xl font-black text-white">District Command Center</h1>
              <p className="text-blue-200 text-sm mt-1">Tamil Nadu — Flood Emergency — Real-time Overview</p>
            </div>
            <div className="flex items-center gap-3">
              {emergencyMode && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl animate-pulse" style={{ background: '#dc2626' }}>
                  <AlertTriangle size={16} className="text-white" />
                  <span className="text-white font-black text-sm">EMERGENCY OVERRIDE ACTIVE</span>
                </div>
              )}
              <button
                onClick={handleEmergencyOverride}
                className="px-5 py-2.5 rounded-xl font-black text-sm text-white transition-all hover:scale-105"
                style={{ background: emergencyMode ? '#16a34a' : '#dc2626', boxShadow: `0 4px 20px ${emergencyMode ? '#16a34a' : '#dc2626'}66` }}
              >
                {emergencyMode ? '✅ Deactivate Override' : '⚡ Emergency Override'}
              </button>
            </div>
          </div>

          {/* High-level KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            {[
              { label: 'Total Requests', v: totalRequests, color: '#93c5fd', icon: '📋' },
              { label: 'Resolution Rate', v: `${resolvedPct}%`, color: '#4ade80', icon: '✅' },
              { label: 'Critical Pending', v: criticalRequests.length, color: '#f87171', icon: '🚨' },
              { label: 'Volunteers Active', v: state.volunteers.filter(v => v.status !== 'offline').length, color: '#34d399', icon: '🦺' },
              { label: 'Zones Affected', v: Object.keys(zoneSummary).length, color: '#fbbf24', icon: '🗺️' },
            ].map(k => (
              <div key={k.label} className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="text-3xl">{k.icon}</div>
                <div className="text-2xl font-black mt-1" style={{ color: k.color }}>{k.v}</div>
                <div className="text-xs text-blue-300 mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* View switcher */}
        <div className="flex gap-2 mb-5">
          <button onClick={() => setActiveView('map')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
              activeView === 'map' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}>
            <Map size={15} /> District Map
          </button>
          <button onClick={() => setActiveView('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
              activeView === 'analytics' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}>
            <BarChart3 size={15} /> Analytics
          </button>
        </div>

        {activeView === 'map' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Map */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="font-bold text-gray-800 text-sm">🗺️ District-Level Map View</span>
                  <div className="flex gap-2 text-xs">
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-semibold">Red = Critical</span>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-semibold">Amber = High</span>
                  </div>
                </div>
                <MapView
                  requests={state.requests}
                  volunteers={state.volunteers}
                  height="480px"
                  showHeatmap
                />
              </div>
            </div>

            {/* District table */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="font-bold text-gray-800 text-sm mb-4">📊 Zone Control Status</div>
                <div className="space-y-3">
                  {Object.entries(zoneSummary).map(([zone, data]) => {
                    const pct = Math.round((data.completed / data.requests) * 100);
                    const sev = data.critical >= 5 ? 'critical' : data.critical >= 2 ? 'high' : data.requests > 10 ? 'medium' : 'low';
                    const sevColors: Record<string, string> = { critical: '#dc2626', high: '#d97706', medium: '#2563eb', low: '#16a34a' };
                    return (
                      <div key={zone} className="rounded-xl p-3 border" style={{ borderColor: sevColors[sev] + '44', background: sevColors[sev] + '08' }}>
                        <div className="flex justify-between mb-1">
                          <span className="font-bold text-xs text-gray-800">{zone}</span>
                          <span className="text-xs font-bold" style={{ color: sevColors[sev] }}>{sev.toUpperCase()}</span>
                        </div>
                        <div className="flex gap-3 text-xs text-gray-600 mb-2">
                          <span>📋 {data.requests} total</span>
                          <span>✅ {data.completed} done</span>
                          <span className="text-red-600 font-bold">🚨 {data.critical} critical</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: sevColors[sev] }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{pct}% resolved</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* District table from MOCK_DISTRICTS */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="font-bold text-gray-800 text-sm mb-3">🏢 District Overview</div>
                <div className="space-y-2">
                  {MOCK_DISTRICTS.map(d => {
                    const sevColor: Record<string, string> = { critical: '#dc2626', high: '#d97706', medium: '#2563eb', low: '#16a34a' };
                    return (
                      <div key={d.name} className="flex items-center justify-between text-xs p-2 rounded-lg bg-gray-50">
                        <div className="font-medium text-gray-800">{d.name}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">{d.requests} req</span>
                          <span
                            className="px-2 py-0.5 rounded-full font-bold text-white text-xs"
                            style={{ background: sevColor[d.severity] }}
                          >
                            {d.severity}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Category breakdown */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <BarChart3 size={16} className="text-blue-600" /> Requests by Category
              </div>
              <div className="space-y-3">
                {Object.entries(categoryBreakdown).map(([cat, count]) => {
                  const pct = Math.round((count / totalRequests) * 100);
                  const catColors: Record<string, string> = { medical: '#dc2626', rescue: '#d97706', food: '#2563eb', water: '#0891b2', shelter: '#7c3aed' };
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-gray-700">{CAT_ICONS[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                        <span className="font-bold" style={{ color: catColors[cat] }}>{count} ({pct}%)</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: catColors[cat] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Resource depletion forecast */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-amber-500" /> AI Resource Depletion Forecast
              </div>
              <div className="space-y-3">
                {forecasts.filter(f => f.daysUntilDepletion !== null).sort((a, b) => (a.daysUntilDepletion ?? 99) - (b.daysUntilDepletion ?? 99)).map(f => (
                  <div key={f.resourceName} className={`p-3 rounded-xl border ${f.isUrgent ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-xs text-gray-800">{f.resourceName}</div>
                      <div className={`font-black text-sm ${f.isUrgent ? 'text-red-600' : 'text-gray-600'}`}>
                        {f.isUrgent ? '⚠️ ' : ''}{f.daysUntilDepletion}d
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{f.available.toLocaleString()} {f.unit} remaining</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Volunteer performance */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="font-bold text-gray-800 mb-4">🏆 Top Volunteers</div>
              <div className="space-y-2">
                {state.volunteers
                  .sort((a, b) => b.tasksCompleted - a.tasksCompleted)
                  .slice(0, 8)
                  .map((v, i) => (
                    <div key={v.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-5 text-xs font-bold">{i + 1}.</span>
                        <span className="font-medium text-gray-800">{v.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-green-500" style={{ width: `${Math.min(100, v.tasksCompleted * 7)}%` }} />
                        </div>
                        <span className="text-xs font-bold text-green-600">{v.tasksCompleted}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Quick comms */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Zap size={16} className="text-amber-500" /> Quick Actions
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Deploy Rapid Response Team to Zone A', color: '#dc2626' },
                  { label: 'Request National Disaster Team Support', color: '#d97706' },
                  { label: 'Activate Relief Camp in Kancheepuram', color: '#1a3a6b' },
                  { label: 'Request Additional Medicine Supplies (ICMR)', color: '#7c3aed' },
                ].map(action => (
                  <button key={action.label}
                    onClick={() => broadcastAlert(action.label)}
                    className="w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all hover:text-white"
                    style={{ borderColor: action.color, color: action.color }}
                    onMouseEnter={e => e.currentTarget.style.background = action.color}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
