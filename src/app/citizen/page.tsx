'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useApp } from '@/lib/store';

export default function CitizenPortalPage() {
  const { state } = useApp();

  const myRequests = useMemo(
    () => state.dashboard.requests.filter((req) => req.phone === state.user.phone).slice(0, 6),
    [state.dashboard.requests, state.user.phone],
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <section className="gov-card p-6">
        <h1 className="gov-title text-2xl">Citizen Portal</h1>
        <p className="text-slate-600 mt-1">Access emergency assistance and track your relief requests.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          {[
            { href: '/request-help', label: 'Food Assistance', category: 'food' },
            { href: '/request-help', label: 'Medical Emergency', category: 'medical' },
            { href: '/request-help', label: 'Rescue Required', category: 'rescue' },
            { href: '/request-help', label: 'Shelter Request', category: 'shelter' },
          ].map((item) => (
            <Link key={item.label} href={`${item.href}?category=${item.category}`} className="gov-card p-4 text-center no-underline text-[#0b3c5d] font-medium hover:bg-slate-50">
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid lg:grid-cols-3 gap-4">
        <div className="gov-card p-5 lg:col-span-1">
          <h2 className="gov-title text-lg">Profile</h2>
          <div className="text-sm text-slate-600 mt-3 space-y-2">
            <p><strong>Name:</strong> {state.user.name || 'Guest Citizen'}</p>
            <p><strong>Phone:</strong> {state.user.phone || '-'}</p>
            <p><strong>Location:</strong> {state.user.location || 'Jharkhand (not set)'}</p>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <Link href="/request-help" className="px-3 py-2 rounded-md bg-[#0b3c5d] text-white text-center no-underline">Request Help</Link>
            <Link href="/request-status" className="px-3 py-2 rounded-md border border-slate-300 text-slate-700 text-center no-underline">Track Request</Link>
          </div>
        </div>

        <div className="gov-card p-5 lg:col-span-2">
          <h2 className="gov-title text-lg">Previous Requests</h2>
          <div className="mt-3 space-y-2">
            {myRequests.length === 0 && <p className="text-sm text-slate-500">No previous requests found for current phone number.</p>}
            {myRequests.map((req) => (
              <div key={req.id} className="border border-slate-200 rounded-md p-3 text-sm flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-700">{req.id} - {req.category}</p>
                  <p className="text-slate-500">{req.location}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700">{req.status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}