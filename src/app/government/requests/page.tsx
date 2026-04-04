'use client';

import { useMemo, useState } from 'react';
import GovernmentPortalNav from '@/components/GovernmentPortalNav';
import { useApp } from '@/lib/store';
import { mergeDuplicateRequest } from '@/lib/api';
import { priorityLabel, suggestNearestVolunteer } from '@/lib/aiLogic';

export default function GovernmentRequestsPage() {
  const { state, assignRequest, changePriority, refreshDashboard, isAssigningRequest, isMutating } = useApp();
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'critical' | 'medium' | 'low'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'assigned' | 'completed'>('all');
  const [zoneFilter, setZoneFilter] = useState<'all' | 'Ranchi' | 'Dhanbad' | 'Jamshedpur'>('all');
  const [processingMergeId, setProcessingMergeId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return state.dashboard.requests.filter((req) => {
      const p = priorityLabel(req.priority).toLowerCase();
      if (priorityFilter !== 'all' && p !== priorityFilter) return false;
      if (statusFilter !== 'all' && req.status !== statusFilter) return false;
      if (zoneFilter !== 'all' && req.zone !== zoneFilter) return false;
      return true;
    });
  }, [state.dashboard.requests, priorityFilter, statusFilter, zoneFilter]);

  const mergeDuplicates = async (requestId: string) => {
    const req = state.dashboard.requests.find((item) => item.id === requestId);
    if (!req) return;
    setProcessingMergeId(requestId);
    try {
      await mergeDuplicateRequest({
        name: `Merge-${req.name}`,
        phone: req.phone,
        category: req.category,
        people: 1,
        location: req.location,
        zone: req.zone,
        source: req.source ?? 'web',
      });
      await refreshDashboard();
    } finally {
      setProcessingMergeId(null);
    }
  };

  const assignSmart = async (requestId: string) => {
    const req = state.dashboard.requests.find((item) => item.id === requestId);
    if (!req) return;
    const nearest = suggestNearestVolunteer(req, state.dashboard.volunteers);
    if (!nearest) return;
    await assignRequest(requestId, nearest.id);
  };

  return (
    <div className="min-h-screen bg-white text-slate-700">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-4">
          <h1 className="text-2xl font-black text-[#0b3c5d]">Request Management</h1>
          <p className="text-sm text-slate-600 mt-1">Filter, prioritize, assign, and merge duplicate requests in real-time.</p>
        </div>

        <GovernmentPortalNav />

        <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-4 text-slate-700 space-y-4">
          <div className="grid md:grid-cols-3 gap-2 text-sm">
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as typeof priorityFilter)} className="border border-slate-300 rounded-md px-3 py-2">
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="border border-slate-300 rounded-md px-3 py-2">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="completed">Completed</option>
            </select>
            <select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value as typeof zoneFilter)} className="border border-slate-300 rounded-md px-3 py-2">
              <option value="all">All Locations</option>
              <option value="Dhanbad">Dhanbad</option>
              <option value="Ranchi">Ranchi</option>
              <option value="Jamshedpur">Jamshedpur</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-270 text-sm">
              <thead className="bg-[#e9f1f9] text-[#0b3c5d]">
                <tr>
                  <th className="text-left px-3 py-2">Request ID</th>
                  <th className="text-left px-3 py-2">Name</th>
                  <th className="text-left px-3 py-2">Family Size</th>
                  <th className="text-left px-3 py-2">Need Type</th>
                  <th className="text-left px-3 py-2">Priority</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Source</th>
                  <th className="text-left px-3 py-2">Zone</th>
                  <th className="text-left px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((req) => {
                  const pr = priorityLabel(req.priority);
                  const assigning = isAssigningRequest(req.id);
                  return (
                    <tr key={req.id} className="border-t border-slate-200 align-top">
                      <td className="px-3 py-2 font-semibold text-slate-800">{req.id}</td>
                      <td className="px-3 py-2">{req.name}</td>
                      <td className="px-3 py-2">{req.people}</td>
                      <td className="px-3 py-2 capitalize">{req.category}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${pr === 'Critical' ? 'bg-red-100 text-red-700' : pr === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                          {pr}
                        </span>
                      </td>
                      <td className="px-3 py-2 capitalize">{req.status}</td>
                      <td className="px-3 py-2 uppercase">{(req.source ?? 'web').replace('_', ' ')}</td>
                      <td className="px-3 py-2">{req.zone}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => assignSmart(req.id)}
                            disabled={assigning || req.status !== 'pending'}
                            className="px-2 py-1 rounded-md bg-[#0b3c5d] text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {assigning ? 'Assigning...' : 'Assign'}
                          </button>
                          <button
                            onClick={() => changePriority(req.id, req.priority + 5)}
                            disabled={isMutating}
                            className="px-2 py-1 rounded-md border border-amber-600 text-amber-700 text-xs disabled:opacity-50"
                          >
                            Increase Priority
                          </button>
                          <button
                            onClick={() => mergeDuplicates(req.id)}
                            disabled={processingMergeId === req.id}
                            className="px-2 py-1 rounded-md border border-[#0b3c5d] text-[#0b3c5d] text-xs disabled:opacity-50"
                          >
                            {processingMergeId === req.id ? 'Merging...' : 'Merge Duplicates'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="text-sm text-slate-500">No requests match the selected filters.</div>
          )}

          <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
            Every action is synced with live dashboard refresh to update map, inventory, volunteer availability, and request states across all government pages.
          </div>
        </div>
      </div>
    </div>
  );
}
