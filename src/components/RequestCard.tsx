'use client';

import { HelpRequest } from '@/lib/mockData';
import { AlertCircle, Clock, User, Smartphone } from 'lucide-react';

const SOURCE_LABELS: Record<string, string> = {
  web: '🌐 Web',
  ivr: '📞 IVR',
  missed_call: '📲 Missed Call',
  whatsapp: '💬 WhatsApp',
  drone: '🚁 Drone',
};

const CAT_COLORS: Record<string, string> = {
  medical: '#dc2626',
  rescue: '#d97706',
  food: '#2563eb',
  water: '#0891b2',
  shelter: '#7c3aed',
};

const CAT_ICONS: Record<string, string> = {
  medical: '🏥',
  rescue: '🚨',
  food: '🍱',
  water: '💧',
  shelter: '🏠',
};

interface Props {
  request: HelpRequest;
  onAssign?: () => void;
  compact?: boolean;
}

export default function RequestCard({ request, onAssign, compact }: Props) {
  const color = CAT_COLORS[request.category] || '#1a3a6b';

  const getPriorityLabel = (p: number) => {
    if (p >= 60) return { label: 'CRITICAL', cls: 'priority-critical' };
    if (p >= 44) return { label: 'HIGH', cls: 'priority-high' };
    if (p >= 30) return { label: 'MEDIUM', cls: 'priority-medium' };
    return { label: 'LOW', cls: 'priority-low' };
  };

  const { label: prioLabel, cls: prioCls } = getPriorityLabel(request.priority);

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    if (h > 0) return `${h}h ${m}m ago`;
    return `${m}m ago`;
  };

  return (
    <div
      className="bg-white rounded-xl card-hover border border-gray-100"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{CAT_ICONS[request.category]}</span>
            <div>
              <div className="font-bold text-gray-800 text-sm">{request.id}</div>
              <div className="text-xs text-gray-500">{request.name}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${prioCls}`}>
              {prioLabel}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full status-${request.status}`}>
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </span>
          </div>
        </div>

        {!compact && (
          <>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <User size={12} />
                <span>{request.familySize} members</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={12} />
                <span>{timeAgo(request.createdAt)}</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500 truncate">{request.location.address}</div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {SOURCE_LABELS[request.source]}
              </span>
              {request.assignedVolunteerName && (
                <span className="text-xs text-blue-600 font-medium">
                  → {request.assignedVolunteerName}
                </span>
              )}
            </div>
          </>
        )}

        {onAssign && request.status === 'pending' && (
          <button
            onClick={onAssign}
            className="mt-3 w-full py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(90deg,#1a3a6b,#2563eb)' }}
          >
            Assign Volunteer
          </button>
        )}
      </div>
    </div>
  );
}
