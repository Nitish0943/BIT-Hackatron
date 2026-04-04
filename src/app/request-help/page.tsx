'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/lib/store';
import OfflineBanner from '@/components/OfflineBanner';

const CATEGORIES = [
  { id: 'food', label: 'Food' },
  { id: 'medical', label: 'Medical' },
  { id: 'rescue', label: 'Rescue' },
  { id: 'shelter', label: 'Shelter' },
] as const;

function RequestHelpContent() {
  const params = useSearchParams();
  const initialCategory = (params?.get('category') as 'food' | 'medical' | 'rescue' | 'shelter' | null) ?? 'food';
  const router = useRouter();
  const { state, createRequest, toggleOnline } = useApp();

  const [name, setName] = useState(state.user.name || '');
  const [phone, setPhone] = useState(state.user.phone || '');
  const [location, setLocation] = useState(state.user.location || 'Ranchi, Jharkhand');
  const [people, setPeople] = useState(1);
  const [category, setCategory] = useState(initialCategory);
  const [requestId, setRequestId] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    if (!name.trim() || !phone.trim() || !location.trim()) {
      setError('Please fill all fields');
      return;
    }
    const result = await createRequest({
      name: name.trim(),
      phone: phone.trim(),
      category,
      people,
      location: location.trim(),
      zone: location.includes('Dhanbad') ? 'Dhanbad' : location.includes('Jamshedpur') ? 'Jamshedpur' : 'Ranchi',
    });
    if (result) {
      setRequestId(result.id);
      setError('');
    } else {
      setError('Saved offline. Sync when online.');
    }
  };

  if (requestId) {
    return (
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="gov-card p-6 text-center space-y-3">
          <h1 className="gov-title text-2xl">Request Submitted</h1>
          <p className="text-slate-600">Your request ID is:</p>
          <p className="text-2xl font-bold text-[#0b3c5d]">{requestId}</p>
          <button onClick={() => router.push(`/request-status?id=${requestId}`)} className="w-full px-4 py-2 rounded-md bg-[#0b3c5d] text-white">Track Status</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-4">
      <div className="gov-card p-5">
        <h1 className="gov-title text-xl">Request Emergency Help</h1>
        <p className="text-sm text-slate-600 mt-1">Submit request to district command center.</p>

        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs text-slate-500">Online Mode</span>
          <button onClick={() => toggleOnline(!state.isOnline)} className={`w-12 h-6 rounded-full ${state.isOnline ? 'bg-green-500' : 'bg-slate-400'}`}>
            <div className={`h-5 w-5 rounded-full bg-white transition-transform ${state.isOnline ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      <div className="gov-card p-5 space-y-3">
        <label className="text-sm font-medium text-slate-700">Category</label>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`px-3 py-2 rounded-md border ${category === c.id ? 'bg-[#0b3c5d] text-white border-[#0b3c5d]' : 'border-slate-300 text-slate-700'}`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <input className="w-full border border-slate-300 rounded-md px-3 py-2" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="w-full border border-slate-300 rounded-md px-3 py-2" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input className="w-full border border-slate-300 rounded-md px-3 py-2" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        <input className="w-full border border-slate-300 rounded-md px-3 py-2" type="number" min={1} max={30} placeholder="People affected" value={people} onChange={(e) => setPeople(Number(e.target.value))} />
        {error && <p className="text-sm text-amber-700">{error}</p>}
        <button onClick={submit} className="w-full px-4 py-2 rounded-md bg-[#0b3c5d] text-white">Submit Request</button>
      </div>

      <OfflineBanner />
    </div>
  );
}

export default function RequestHelpPage() {
  return (
    <Suspense fallback={<div className="max-w-xl mx-auto px-4 py-8 text-slate-600">Loading request form...</div>}>
      <RequestHelpContent />
    </Suspense>
  );
}
