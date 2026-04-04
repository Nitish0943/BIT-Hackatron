'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/lib/store';
import { HelpRequest } from '@/lib/mockData';
import { Filter, CheckCircle, XCircle, MapPin, Users, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

const CAT_ICONS: Record<string, string> = {
  medical: '🏥', rescue: '🚨', food: '🍱', water: '💧', shelter: '🏠',
};

const CAT_COLORS: Record<string, string> = {
  medical: '#dc2626', rescue: '#d97706', food: '#2563eb', water: '#0891b2', shelter: '#7c3aed',
};

export default function VolunteerDashboardPage() {
  const { state, updateStatus, assignVolunteer } = useApp();
  const [filter, setFilter] = useState<'all' | 'medical' | 'rescue' | 'food' | 'water' | 'shelter'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [myTasks, setMyTasks] = useState<string[]>(['REQ-0001', 'REQ-0003', 'REQ-0007']);

  // Simulate logged-in volunteer: VOL-001
  const ME = state.volunteers[0];

  const pendingTasks = useMemo(() => {
    return state.requests
      .filter(r => r.status === 'pending' && (filter === 'all' || r.category === filter))
      .sort((a, b) => b.priority - a.priority);
  }, [state.requests, filter]);

  const assignedToMe = useMemo(() =>
    state.requests.filter(r => r.status === 'assigned' && (r.assignedVolunteerId === ME?.id || myTasks.includes(r.id))),
    [state.requests, ME, myTasks]
  );

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3_600_000);
    if (h > 0) return `${h}h ago`;
    return `${Math.floor((diff % 3_600_000) / 60_000)}m ago`;
  };

  const handleAccept = (req: HelpRequest) => {
    assignVolunteer(req.id, ME?.id ?? 'VOL-001');
    setMyTasks(prev => [...prev, req.id]);
  };

  const handleComplete = (reqId: string) => {
    updateStatus(reqId, 'completed');
    setMyTasks(prev => prev.filter(id => id !== reqId));
  };

  return (
    <div className="min-h-screen" style={{ background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#0a1628,#1a3a6b)' }} className="px-4 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-blue-300 text-xs font-semibold uppercase tracking-widest">Volunteer Portal</div>
              <h1 className="text-2xl font-black text-white mt-1">My Task Dashboard</h1>
              {ME && <div className="text-blue-200 text-sm mt-1">👋 {ME.name} — Zone: {ME.zone}</div>}
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-white">{ME?.tasksCompleted ?? 0}</div>
              <div className="text-blue-300 text-xs">Tasks Completed</div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { label: 'Available Tasks', value: pendingTasks.length, color: '#d97706' },
              { label: 'My Active Tasks', value: assignedToMe.length, color: '#2563eb' },
              { label: 'Critical Priority', value: pendingTasks.filter(r => r.priority >= 60).length, color: '#dc2626' },
            ].map(s => (
              <div key={s.label} className="bg-white bg-opacity-10 rounded-xl p-3 text-center">
                <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs text-blue-200">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Task list */}
          <div className="lg:col-span-2">
            {/* My assigned tasks */}
            {assignedToMe.length > 0 && (
              <div className="mb-6">
                <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block animate-pulse"></span>
                  My Active Tasks
                </h2>
                <div className="space-y-3">
                  {assignedToMe.map(req => (
                    <div key={req.id} className="bg-white rounded-xl border-2 border-blue-200 p-4 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{CAT_ICONS[req.category]}</span>
                          <div>
                            <div className="font-bold text-gray-800">{req.id}</div>
                            <div className="text-sm text-gray-600">{req.name} — {req.familySize} members</div>
                            <div className="text-xs text-gray-500 mt-1">{req.location.address}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleComplete(req.id)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs font-bold"
                          style={{ background: '#16a34a' }}
                        >
                          <CheckCircle size={14} /> Mark Complete
                        </button>
                      </div>
                      <div className="mt-3 h-1.5 bg-blue-100 rounded-full overflow-hidden">
                        <div className="h-full w-3/5 rounded-full" style={{ background: '#2563eb' }} />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">ETA: {req.eta}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filter */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Filter size={14} className="text-gray-500" />
              {(['all', 'medical', 'rescue', 'food', 'water', 'shelter'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filter === f ? 'text-white' : 'bg-white border border-gray-200 text-gray-600'
                  }`}
                  style={{ background: filter === f ? (CAT_COLORS[f] ?? '#1a3a6b') : undefined }}
                >
                  {f === 'all' ? '🗂 All' : CAT_ICONS[f] + ' ' + f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            <h2 className="font-bold text-gray-800 mb-3">Available Tasks — Sorted by Priority</h2>
            <div className="space-y-3">
              {pendingTasks.slice(0, 15).map(req => {
                const isExpanded = expandedId === req.id;
                return (
                  <div key={req.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                    style={{ borderLeft: `4px solid ${CAT_COLORS[req.category]}` }}>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-2xl shrink-0">{CAT_ICONS[req.category]}</span>
                          <div className="min-w-0">
                            <div className="font-bold text-gray-800 text-sm">{req.id} – {req.name}</div>
                            <div className="text-xs text-gray-500 truncate">{req.location.address}</div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                              <span className="flex items-center gap-1"><Users size={11} />{req.familySize}</span>
                              <span className="flex items-center gap-1"><Clock size={11} />{timeAgo(req.createdAt)}</span>
                              <span className="font-bold" style={{ color: req.priority >= 60 ? '#dc2626' : req.priority >= 44 ? '#d97706' : '#2563eb' }}>
                                P:{req.priority}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => handleAccept(req)}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg text-white text-xs font-bold"
                            style={{ background: '#16a34a' }}>
                            <CheckCircle size={12} /> Accept
                          </button>
                          <button onClick={() => setExpandedId(isExpanded ? null : req.id)}
                            className="p-2 rounded-lg border border-gray-200 text-gray-500">
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-gray-100 p-4 bg-gray-50">
                        <div className="text-sm text-gray-700 mb-2">{req.description}</div>
                        <div className="text-xs text-gray-500">
                          📍 Lat: {req.location.lat.toFixed(5)}, Lng: {req.location.lng.toFixed(5)}
                        </div>
                        {req.resourcesNeeded && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {Object.entries(req.resourcesNeeded).filter(([,v]) => v > 0).map(([k,v]) => (
                              <span key={k} className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                                {v} {k.replace(/_/g,' ')}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Map sidebar */}
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-20">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <MapPin size={15} className="text-blue-600" />
                <span className="font-bold text-sm text-gray-800">Nearby Requests</span>
              </div>
              <MapView
                requests={pendingTasks.slice(0, 20)}
                volunteers={ME ? [ME] : []}
                height="320px"
                showHeatmap
              />
              <div className="p-3 text-xs text-gray-500 border-t border-gray-100">
                🟡 Your position (green) | Requests shown by category color
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
