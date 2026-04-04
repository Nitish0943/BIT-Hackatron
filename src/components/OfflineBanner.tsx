'use client';

import { useApp } from '@/lib/store';
import { WifiOff, RefreshCw } from 'lucide-react';

export default function OfflineBanner() {
  const { state, toggleOnline, syncPending } = useApp();

  if (state.isOnline && state.pendingSync.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 rounded-xl p-4 shadow-xl"
      style={{ background: '#0a1628', border: '1px solid #dc2626' }}
    >
      <div className="flex items-start gap-3">
        <WifiOff size={20} className="text-red-400 mt-0.5 shrink-0" />
        <div className="flex-1">
          <div className="text-white font-bold text-sm">
            {state.isOnline ? 'Pending Requests' : 'Offline Mode Active'}
          </div>
          <div className="text-gray-400 text-xs mt-1">
            {state.pendingSync.length} request(s) queued for sync.
            {!state.isOnline && ' System is operating in offline mode.'}
          </div>
          <div className="mt-2 text-xs text-blue-300">
            Fallback: Use IVR (1800-XXX-XXXX) or send SMS to 567
          </div>
          {state.pendingSync.length > 0 && state.isOnline && (
            <button
              onClick={syncPending}
              className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
              style={{ background: '#16a34a' }}
            >
              <RefreshCw size={12} />
              Sync Now ({state.pendingSync.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
