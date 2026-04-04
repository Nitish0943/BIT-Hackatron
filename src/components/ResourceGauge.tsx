'use client';

import { Resource } from '@/lib/mockData';
import { DepletionForecast } from '@/lib/aiLogic';

interface Props {
  resources: Resource[];
  forecasts: DepletionForecast[];
}

export default function ResourceGauge({ resources, forecasts }: Props) {
  const getPct = (resource: Resource) => Math.round((resource.available / Math.max(resource.total, 1)) * 100);

  return (
    <div className="space-y-3">
      {resources.map((resource) => {
        const pct = getPct(resource);
        const forecast = forecasts.find((item) => item.resourceName === resource.name);
        const color = pct < 30 ? '#c62828' : pct < 50 ? '#f9a825' : '#2e7d32';

        return (
          <div key={resource.name} className="border border-slate-200 rounded-md p-2">
            <div className="flex justify-between items-center mb-1 text-xs">
              <span className="font-semibold text-gray-700">{resource.name}</span>
              <span className="font-bold" style={{ color }}>{resource.available} / {resource.total}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full" style={{ width: `${pct}%`, background: color }} />
            </div>
            <div className="flex justify-between mt-1 text-xs text-slate-500">
              <span>{pct}% remaining</span>
              <span>{forecast?.isUrgent ? 'Low stock' : 'Stable'}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
