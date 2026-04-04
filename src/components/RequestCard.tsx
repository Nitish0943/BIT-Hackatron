'use client';

import { HelpRequest } from '@/lib/mockData';
import { Clock, User } from 'lucide-react';

const CAT_COLORS: Record<string, string> = {
  medical: '#c62828',
  rescue: '#f9a825',
  food: '#2e7d32',
  shelter: '#0b3c5d',
};

interface Props {
  request: HelpRequest;
  onAssign?: () => void;
  compact?: boolean;
}

export default function RequestCard({ request, onAssign, compact }: Props) {
  const color = CAT_COLORS[request.category] || '#0b3c5d';

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    if (h > 0) return `${h}h ${m}m ago`;
    return `${m}m ago`;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-bold text-gray-800 text-sm">{request.id}</div>
            <div className="text-xs text-gray-500">{request.name}</div>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{request.status}</span>
        </div>

        {!compact && (
          <>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <User size={12} />
                <span>{request.people} people</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={12} />
                <span>{timeAgo(request.createdAt)}</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500 truncate">{request.location}</div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Zone: {request.zone}</span>
              {request.assignedVolunteerName && <span className="text-xs text-blue-600 font-medium">{request.assignedVolunteerName}</span>}
            </div>
          </>
        )}

        {onAssign && request.status === 'pending' && (
          <button onClick={onAssign} className="mt-3 w-full py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: '#0b3c5d' }}>
            Assign Volunteer
          </button>
        )}
      </div>
    </div>
  );
}
