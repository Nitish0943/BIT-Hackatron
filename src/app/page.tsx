'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useApp } from '@/lib/store';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function HomePage() {
  const { state } = useApp();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <section className="gov-card p-6">
        <p className="text-sm text-slate-500">National Disaster Management Authority</p>
        <h1 className="text-3xl gov-title mt-2">AI-Based Disaster Coordination Platform</h1>
        <p className="text-slate-600 mt-2 max-w-3xl">
          SahayakNet unifies citizen requests, volunteer mobilization, and government monitoring for coordinated disaster response across Jharkhand.
        </p>
        <div className="flex flex-wrap gap-3 mt-6">
          <Link href="/citizen" className="px-4 py-2 rounded-md bg-[#0b3c5d] text-white no-underline">Request Help</Link>
          <Link href="/volunteer/apply" className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 no-underline">Volunteer Registration</Link>
          <Link href="/login/government" className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 no-underline">Government Login</Link>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        {[
          {
            title: 'Affected People',
            body: 'Citizens can submit requests for food, medical support, rescue, and shelter using a simple interface.',
          },
          {
            title: 'Volunteers',
            body: 'Volunteers receive nearby tasks, accept assignments, and close requests with status updates.',
          },
          {
            title: 'Government Control',
            body: 'District control rooms monitor active clusters, resources, and alerts in one dashboard.',
          },
        ].map((item) => (
          <div key={item.title} className="gov-card p-5">
            <h2 className="gov-title text-lg">{item.title}</h2>
            <p className="text-sm text-slate-600 mt-2">{item.body}</p>
          </div>
        ))}
      </section>

      <section className="gov-section p-6">
        <h2 className="gov-title text-xl">Platform Features</h2>
        <div className="grid md:grid-cols-3 gap-4 mt-4">
          <div className="gov-card p-4">
            <h3 className="font-semibold text-[#0b3c5d]">Multi-channel Input</h3>
            <p className="text-sm text-slate-600 mt-1">Web and assisted channels feed the same request queue.</p>
          </div>
          <div className="gov-card p-4">
            <h3 className="font-semibold text-[#0b3c5d]">AI Prioritization</h3>
            <p className="text-sm text-slate-600 mt-1">Priority scoring considers severity, affected people, and waiting time.</p>
          </div>
          <div className="gov-card p-4">
            <h3 className="font-semibold text-[#0b3c5d]">Offline Capability</h3>
            <p className="text-sm text-slate-600 mt-1">Offline requests are queued locally and synced when online.</p>
          </div>
        </div>
      </section>

      <section className="gov-card overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="gov-title text-lg">Jharkhand Situation Map Preview</h2>
          <span className="text-xs text-slate-500">Satellite + Heat Layer</span>
        </div>
        <MapView requests={state.dashboard.requests.slice(0, 30)} volunteers={state.dashboard.volunteers.slice(0, 20)} height="420px" showHeatmap showClusters />
      </section>

      <footer className="gov-card p-4 text-sm text-slate-600 flex flex-wrap gap-4 justify-between">
        <span>NDMA Emergency Helpline: 1078</span>
        <span>State Emergency Operations Center: Jharkhand</span>
        <span>Privacy | Accessibility | Terms</span>
      </footer>
    </div>
  );
}
