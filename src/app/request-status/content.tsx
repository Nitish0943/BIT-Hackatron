'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/lib/store';
import { Search, Clock, User, MapPin, Package } from 'lucide-react';

const STATUS_CONFIG = {
  pending: { label: 'Pending Review', color: '#d97706', bg: '#fff7ed', icon: '⏳' },
  assigned: { label: 'Volunteer Assigned', color: '#2563eb', bg: '#eff6ff', icon: '🚀' },
  completed: { label: 'Help Delivered', color: '#16a34a', bg: '#f0fdf4', icon: '✅' },
};

export default function RequestStatusContent() {
  const searchParams = useSearchParams();
  const { state } = useApp();
  const [query, setQuery] = useState(searchParams?.get('id') ?? '');
  const [result, setResult] = useState<any>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const id = searchParams?.get('id');
    if (id) handleSearch(id);
  }, []);

  const handleSearch = (q?: string) => {
    const search = (q ?? query).trim().toUpperCase();
    if (!search) return;
    const found = state.requests.find(
      r => r.id === search || r.phone === (q ?? query).trim()
    );
    setResult(found ?? null);
    setSearched(true);
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    if (h > 0) return `${h} hours ${m} min ago`;
    return `${m} minutes ago`;
  };

  const sc = result ? STATUS_CONFIG[result.status as keyof typeof STATUS_CONFIG] : null;

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: '#f8fafc' }}>
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔍</div>
          <h1 className="text-2xl font-black text-gray-800">Track Your Request</h1>
          <p className="text-gray-500 text-sm mt-1">Enter your Request ID or phone number</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
          <div className="flex gap-3">
            <input
              className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-blue-500 outline-none"
              placeholder="e.g. REQ-0001 or your phone number"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={() => handleSearch()}
              className="px-5 py-3 rounded-xl text-white font-bold"
              style={{ background: '#1a3a6b' }}>
              <Search size={18} />
            </button>
          </div>
          <div className="mt-3">
            <div className="text-xs text-gray-500 mb-2">Try sample IDs:</div>
            <div className="flex flex-wrap gap-2">
              {['REQ-0001', 'REQ-0005', 'REQ-0010', 'REQ-0025'].map(id => (
                <button key={id} onClick={() => { setQuery(id); handleSearch(id); }}
                  className="px-3 py-1 rounded-lg border border-gray-200 text-xs text-blue-600 hover:bg-blue-50">
                  {id}
                </button>
              ))}
            </div>
          </div>
        </div>

        {searched && !result && (
          <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6 text-center">
            <div className="text-4xl mb-3">❌</div>
            <div className="font-bold text-gray-800">Request not found</div>
            <div className="text-sm text-gray-500 mt-1">Please check your Request ID or phone number</div>
          </div>
        )}

        {result && sc && (
          <div className="space-y-4">
            <div className="rounded-2xl shadow-sm p-6" style={{ background: sc.bg, border: `2px solid ${sc.color}40` }}>
              <div className="flex items-center gap-4">
                <span className="text-5xl">{sc.icon}</span>
                <div>
                  <div className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Current Status</div>
                  <div className="text-2xl font-black mt-1" style={{ color: sc.color }}>{sc.label}</div>
                  <div className="text-sm text-gray-500 mt-1">Request ID: <strong>{result.id}</strong></div>
                </div>
              </div>
              <div className="mt-5">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Submitted</span><span>Assigned</span><span>Completed</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: result.status === 'pending' ? '15%' : result.status === 'assigned' ? '55%' : '100%',
                      background: sc.color,
                    }} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="font-bold text-gray-800 mb-4">Request Details</div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-gray-700"><User size={16} className="text-gray-400" /><span><b>Name:</b> {result.name}</span></div>
                <div className="flex items-center gap-3 text-gray-700">
                  <span className="text-lg">{result.category === 'medical' ? '🏥' : result.category === 'rescue' ? '🚨' : result.category === 'food' ? '🍱' : result.category === 'water' ? '💧' : '🏠'}</span>
                  <span><b>Category:</b> {result.category.charAt(0).toUpperCase() + result.category.slice(1)}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700"><User size={16} className="text-gray-400" /><span><b>Family Size:</b> {result.familySize} members</span></div>
                <div className="flex items-start gap-3 text-gray-700"><MapPin size={16} className="text-gray-400 mt-0.5" /><span><b>Location:</b> {result.location.address}</span></div>
                <div className="flex items-center gap-3 text-gray-700"><Clock size={16} className="text-gray-400" /><span><b>Submitted:</b> {timeAgo(result.createdAt)}</span></div>
                {result.assignedVolunteerName && (
                  <div className="flex items-center gap-3 text-blue-700">
                    <User size={16} className="text-blue-400" />
                    <span><b>Volunteer:</b> {result.assignedVolunteerName} — ETA: {result.eta}</span>
                  </div>
                )}
              </div>
            </div>

            {result.resourcesNeeded && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Package size={16} className="text-blue-500" /> Resources Being Arranged</div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(result.resourcesNeeded).filter(([, v]: any) => v > 0).map(([k, v]: any) => (
                    <div key={k} className="rounded-lg p-2 bg-blue-50 text-xs">
                      <div className="font-bold text-blue-800">{v}</div>
                      <div className="text-blue-600 capitalize">{k.replace(/_/g, ' ')}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
