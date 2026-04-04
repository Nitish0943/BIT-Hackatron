'use client';

import { useMemo } from 'react';
import GovernmentPortalNav from '@/components/GovernmentPortalNav';
import { useApp } from '@/lib/store';
import { requiredResources } from '@/lib/aiLogic';

export default function GovernmentInventoryPage() {
  const { state } = useApp();

  const required = useMemo(
    () => requiredResources(state.dashboard.requests.filter((item) => item.status !== 'completed')),
    [state.dashboard.requests],
  );

  const items = [
    { key: 'Food Packets', required: required.food },
    { key: 'Medical Kits', required: required.medicine },
    { key: 'Shelter Units', required: required.shelter },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-700">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-4">
          <h1 className="text-2xl font-black text-[#0b3c5d]">Inventory Management</h1>
          <p className="text-sm text-slate-600 mt-1">Track available vs required stock and monitor usage rates.</p>
        </div>

        <GovernmentPortalNav />

        <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-4 text-slate-700">
          <div className="grid md:grid-cols-3 gap-3">
            {items.map((item) => {
              const resource = state.dashboard.resources.find((r) => r.name === item.key);
              if (!resource) return null;
              const shortage = item.required > resource.available;
              const pct = Math.max(0, Math.min(100, Math.round((resource.available / Math.max(resource.total, 1)) * 100)));
              const shortageCount = Math.max(0, item.required - resource.available);
              return (
                <div key={item.key} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
                  <h2 className="font-bold text-[#0b3c5d] text-lg">{item.key}</h2>
                  <p className="text-sm">Available: <strong>{resource.available}</strong></p>
                  <p className="text-sm">Required: <strong>{item.required}</strong></p>
                  <p className="text-sm">Usage rate: <strong>{resource.dailyConsumption ?? 0}/day</strong></p>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full ${shortage ? 'bg-red-600' : 'bg-[#0b3c5d]'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-xs text-slate-600">{pct}% stock available</div>
                  <div className={`text-xs px-2 py-1 rounded-full inline-block ${shortage ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {shortage ? 'Shortage risk' : 'Stock healthy'}
                  </div>
                  {shortage && <div className="text-sm font-semibold text-red-700">Shortage: {shortageCount} {item.key.toLowerCase()}</div>}
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 text-sm font-semibold">
            Shortage: {Math.max(0, required.food - (state.dashboard.resources.find((r) => r.name === 'Food Packets')?.available ?? 0))} food kits
          </div>
        </div>
      </div>
    </div>
  );
}
