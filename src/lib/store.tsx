'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  assignVolunteer,
  completeRequest,
  createBroadcastAlert,
  createRequest as createRequestApi,
  getDashboard,
  setVolunteerStatus,
  updatePriority,
} from './api';
import { DashboardData, FALLBACK_DASHBOARD, HelpRequest } from './mockData';
import { getUser as getAuthUser, login as authLogin, logout as authLogout } from './auth';

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
  broadcastAlert: (message: string) => Promise<void>;
  setVolunteerAvailability: (volunteerId: string, availability: 'available' | 'busy' | 'inactive') => Promise<void>;
  isAssigningRequest: (requestId: string) => boolean;
  isMutating: boolean;
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
  const [assigningRequestIds, setAssigningRequestIds] = useState<string[]>([]);
  const [isMutating, setIsMutating] = useState(false);

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
    } else {
      const authUser = getAuthUser();
      if (authUser.role) {
        setUser({ role: authUser.role, name: authUser.name, phone: '' });
      }
    }
    refreshDashboard();
  }, [refreshDashboard]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshDashboard();
    }, 3000);
    return () => window.clearInterval(timer);
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
      setIsMutating(true);
      try {
        const req = await createRequestApi(payload);
        await refreshDashboard();
        return req;
      } finally {
        setIsMutating(false);
      }
    },
    [isOnline, refreshDashboard],
  );

  const assignRequest = useCallback(
    async (requestId: string, volunteerId: string) => {
      setAssigningRequestIds((prev) => (prev.includes(requestId) ? prev : [...prev, requestId]));
      setIsMutating(true);
      try {
        await assignVolunteer({ request_id: requestId, volunteer_id: volunteerId });
        await refreshDashboard();
      } finally {
        setAssigningRequestIds((prev) => prev.filter((id) => id !== requestId));
        setIsMutating(false);
      }
    },
    [refreshDashboard],
  );

  const completeRequestById = useCallback(
    async (requestId: string) => {
      setIsMutating(true);
      try {
        await completeRequest({ request_id: requestId });
        await refreshDashboard();
      } finally {
        setIsMutating(false);
      }
    },
    [refreshDashboard],
  );

  const changePriority = useCallback(
    async (requestId: string, priority: number) => {
      setIsMutating(true);
      try {
        await updatePriority({ request_id: requestId, priority });
        await refreshDashboard();
      } finally {
        setIsMutating(false);
      }
    },
    [refreshDashboard],
  );

  const setVolunteerAvailability = useCallback(
    async (volunteerId: string, availability: 'available' | 'busy' | 'inactive') => {
      setIsMutating(true);
      try {
        await setVolunteerStatus({ volunteer_id: volunteerId, availability });
        await refreshDashboard();
      } finally {
        setIsMutating(false);
      }
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

  useEffect(() => {
    if (isOnline && pendingQueue.length > 0) {
      void syncPending();
    }
  }, [isOnline, pendingQueue.length, syncPending]);

  const broadcastAlert = useCallback(async (message: string) => {
    const normalized = message.trim();
    if (!normalized) return;
    setIsMutating(true);
    try {
      const response = await createBroadcastAlert({ message: normalized, channels: ['sms', 'ivr', 'whatsapp'] });
      setDashboard((prev) => ({
        ...prev,
        alerts: [response.feed, ...prev.alerts].slice(0, 20),
      }));
      await refreshDashboard();
    } catch {
      setDashboard((prev) => ({
        ...prev,
        alerts: [`${normalized} | Message queued locally`, ...prev.alerts].slice(0, 20),
      }));
    } finally {
      setIsMutating(false);
    }
  }, [refreshDashboard]);

  const isAssigningRequest = useCallback(
    (requestId: string) => assigningRequestIds.includes(requestId),
    [assigningRequestIds],
  );

  const login = useCallback((nextUser: SessionUser) => {
    if (nextUser.role) {
      authLogin(nextUser.role, nextUser.name);
    }
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    authLogout();
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
        setVolunteerAvailability,
        isAssigningRequest,
        isMutating,
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
