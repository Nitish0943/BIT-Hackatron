'use client';

import { Resource } from '@/lib/mockData';
import { DepletionForecast } from '@/lib/aiLogic';

interface Props {
  resources: Resource[];
  forecasts: DepletionForecast[];
}

export default function ResourceGauge({ resources, forecasts }: Props) {
  const getPct = (r: Resource) => Math.round((r.available / r.total) * 100);
  const getColor = (pct: number) => {
    if (pct < 20) return '#dc2626';
    if (pct < 40) return '#d97706';
    return '#16a34a';
  };

  return (
    <div className="space-y-3">
      {resources.map((r) => {
        const pct = getPct(r);
        const color = getColor(pct);
        const forecast = forecasts.find((f) => f.resourceName === r.name);
        return (
          <div key={r.name}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-gray-700">{r.name}</span>
              <span className="text-xs font-bold" style={{ color }}>
                {r.available.toLocaleString()} / {r.total.toLocaleString()} {r.unit}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
            {forecast && forecast.daysUntilDepletion !== null && (
              <div className="flex justify-between mt-0.5">
                <span className="text-xs text-gray-400">{pct}% remaining</span>
                <span
                  className={`text-xs font-semibold ${forecast.isUrgent ? 'text-red-600' : 'text-gray-400'}`}
                >
                  {forecast.isUrgent ? '⚠️ ' : ''}Depletes in {forecast.daysUntilDepletion}d
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
