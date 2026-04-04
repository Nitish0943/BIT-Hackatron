'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  assignVolunteer,
  completeRequest,
  createRequest as createRequestApi,
  getDashboard,
  updatePriority,
} from './api';
import { DashboardData, FALLBACK_DASHBOARD, HelpRequest } from './mockData';

export type UserRole = 'citizen' | 'volunteer' | 'government' | null;

export interface SessionUser {
  role: UserRole;
  name: string;
  phone: string;
  location?: string;
}

interface CreatePayload {
  name: string;
  phone: string;
  category: 'food' | 'medical' | 'rescue' | 'shelter';
  people: number;
  location: string;
  zone: string;
}

interface AppState {
  dashboard: DashboardData;
  loading: boolean;
  error: string;
  isOnline: boolean;
  pendingQueue: CreatePayload[];
  user: SessionUser;
}

interface AppContextValue {
  state: AppState;
  login: (user: SessionUser) => void;
  logout: () => void;
  refreshDashboard: () => Promise<void>;
  createRequest: (payload: CreatePayload) => Promise<HelpRequest | null>;
  assignRequest: (requestId: string, volunteerId: string) => Promise<void>;
  completeRequestById: (requestId: string) => Promise<void>;
  changePriority: (requestId: string, priority: number) => Promise<void>;
  broadcastAlert: (message: string) => void;
  toggleOnline: (value: boolean) => void;
  syncPending: () => Promise<void>;
}

const OFFLINE_KEY = 'sahayaknet_offline_queue';
const USER_KEY = 'sahayaknet_user';

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [dashboard, setDashboard] = useState<DashboardData>(FALLBACK_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [pendingQueue, setPendingQueue] = useState<CreatePayload[]>([]);
  const [user, setUser] = useState<SessionUser>({ role: null, name: '', phone: '' });

  const refreshDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getDashboard();
      setDashboard(data);
      setError('');
    } catch (err) {
      setError((err as Error).message || 'Unable to connect backend');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const queued = localStorage.getItem(OFFLINE_KEY);
    if (queued) {
      setPendingQueue(JSON.parse(queued));
    }
    const savedUser = localStorage.getItem(USER_KEY);
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    refreshDashboard();
  }, [refreshDashboard]);

  useEffect(() => {
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(pendingQueue));
  }, [pendingQueue]);

  useEffect(() => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }, [user]);

  const createRequest = useCallback(
    async (payload: CreatePayload) => {
      if (!isOnline) {
        setPendingQueue((prev) => [payload, ...prev]);
        return null;
      }
      const req = await createRequestApi(payload);
      await refreshDashboard();
      return req;
    },
    [isOnline, refreshDashboard],
  );

  const assignRequest = useCallback(
    async (requestId: string, volunteerId: string) => {
      await assignVolunteer({ request_id: requestId, volunteer_id: volunteerId });
      await refreshDashboard();
    },
    [refreshDashboard],
  );

  const completeRequestById = useCallback(
    async (requestId: string) => {
      await completeRequest({ request_id: requestId });
      await refreshDashboard();
    },
    [refreshDashboard],
  );

  const changePriority = useCallback(
    async (requestId: string, priority: number) => {
      await updatePriority({ request_id: requestId, priority });
      await refreshDashboard();
    },
    [refreshDashboard],
  );

  const syncPending = useCallback(async () => {
    if (!isOnline || pendingQueue.length === 0) return;
    for (const item of pendingQueue) {
      await createRequestApi(item);
    }
    setPendingQueue([]);
    await refreshDashboard();
  }, [isOnline, pendingQueue, refreshDashboard]);

  const broadcastAlert = useCallback((message: string) => {
    if (!message.trim()) return;
    setDashboard((prev) => ({
      ...prev,
      alerts: [message.trim(), ...prev.alerts].slice(0, 15),
    }));
  }, []);

  const login = useCallback((nextUser: SessionUser) => {
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    setUser({ role: null, name: '', phone: '' });
    localStorage.removeItem(USER_KEY);
  }, []);

  const state = useMemo(
    () => ({
      dashboard,
      loading,
      error,
      isOnline,
      pendingQueue,
      user,
    }),
    [dashboard, loading, error, isOnline, pendingQueue, user],
  );

  return (
    <AppContext.Provider
      value={{
        state,
        login,
        logout,
        refreshDashboard,
        createRequest,
        assignRequest,
        completeRequestById,
        changePriority,
        broadcastAlert,
        toggleOnline: setIsOnline,
        syncPending,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
