'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import {
  HelpRequest, Volunteer, Resource, RequestCategory,
  MOCK_REQUESTS, MOCK_VOLUNTEERS, MOCK_RESOURCES,
} from './mockData';
import { computePriority, findDuplicate, calculateResources } from './aiLogic';

export interface AppState {
  requests: HelpRequest[];
  volunteers: Volunteer[];
  resources: Resource[];
  alerts: string[];
  isOnline: boolean;
  pendingSync: HelpRequest[];
}

type Action =
  | { type: 'CREATE_REQUEST'; payload: Omit<HelpRequest, 'id' | 'priority' | 'createdAt'> & { createdAt?: string } }
  | { type: 'ASSIGN_VOLUNTEER'; requestId: string; volunteerId: string }
  | { type: 'UPDATE_STATUS'; requestId: string; status: HelpRequest['status'] }
  | { type: 'BROADCAST_ALERT'; message: string }
  | { type: 'TOGGLE_ONLINE'; value: boolean }
  | { type: 'SYNC_PENDING' }
  | { type: 'SET_VOLUNTEER_STATUS'; volunteerId: string; status: Volunteer['status'] };

let reqCounter = MOCK_REQUESTS.length + 1;

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'CREATE_REQUEST': {
      const { category, familySize, location, phone } = action.payload;

      // Duplicate detection
      const dup = findDuplicate({ location, category, phone }, state.requests);
      if (dup) {
        // Merge: increase family size on existing
        return {
          ...state,
          requests: state.requests.map((r) =>
            r.id === dup.id
              ? { ...r, familySize: r.familySize + familySize, isDuplicate: true }
              : r,
          ),
        };
      }

      const id = `REQ-${String(reqCounter++).padStart(4, '0')}`;
      const createdAt = action.payload.createdAt ?? new Date().toISOString();
      const priority = computePriority(category, familySize, createdAt);
      const resourcesNeeded = calculateResources(category, familySize);

      const newReq: HelpRequest = {
        ...action.payload,
        id,
        createdAt,
        priority,
        resourcesNeeded,
      };

      if (!state.isOnline) {
        return { ...state, pendingSync: [...state.pendingSync, newReq] };
      }
      return { ...state, requests: [newReq, ...state.requests] };
    }

    case 'ASSIGN_VOLUNTEER': {
      const volunteer = state.volunteers.find((v) => v.id === action.volunteerId);
      return {
        ...state,
        requests: state.requests.map((r) =>
          r.id === action.requestId
            ? {
                ...r,
                status: 'assigned',
                assignedVolunteerId: action.volunteerId,
                assignedVolunteerName: volunteer?.name,
                eta: `${Math.floor(Math.random() * 60) + 15} mins`,
              }
            : r,
        ),
        volunteers: state.volunteers.map((v) =>
          v.id === action.volunteerId ? { ...v, status: 'busy' } : v,
        ),
      };
    }

    case 'UPDATE_STATUS': {
      return {
        ...state,
        requests: state.requests.map((r) =>
          r.id === action.requestId ? { ...r, status: action.status } : r,
        ),
        volunteers: action.status === 'completed'
          ? state.volunteers.map((v) => {
              const req = state.requests.find((r) => r.id === action.requestId);
              return req?.assignedVolunteerId === v.id
                ? { ...v, status: 'available', tasksCompleted: v.tasksCompleted + 1 }
                : v;
            })
          : state.volunteers,
      };
    }

    case 'BROADCAST_ALERT':
      return { ...state, alerts: [action.message, ...state.alerts].slice(0, 20) };

    case 'TOGGLE_ONLINE':
      return { ...state, isOnline: action.value };

    case 'SYNC_PENDING':
      return {
        ...state,
        requests: [...state.pendingSync, ...state.requests],
        pendingSync: [],
      };

    case 'SET_VOLUNTEER_STATUS':
      return {
        ...state,
        volunteers: state.volunteers.map((v) =>
          v.id === action.volunteerId ? { ...v, status: action.status } : v,
        ),
      };

    default:
      return state;
  }
}

const initialState: AppState = {
  requests: MOCK_REQUESTS,
  volunteers: MOCK_VOLUNTEERS,
  resources: MOCK_RESOURCES,
  alerts: ['🚨 FLOOD ALERT: Maximum rainfall recorded in Kancheepuram district', '⚠️ All volunteers report to designated assembly points immediately'],
  isOnline: true,
  pendingSync: [],
};

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  createRequest: (data: Omit<HelpRequest, 'id' | 'priority' | 'createdAt' | 'resourcesNeeded'>) => string;
  assignVolunteer: (requestId: string, volunteerId: string) => void;
  updateStatus: (requestId: string, status: HelpRequest['status']) => void;
  broadcastAlert: (message: string) => void;
  toggleOnline: (value: boolean) => void;
  syncPending: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Persist pending to localStorage
  useEffect(() => {
    if (state.pendingSync.length > 0) {
      localStorage.setItem('sahayaknet_pending', JSON.stringify(state.pendingSync));
    }
  }, [state.pendingSync]);

  const createRequest = useCallback(
    (data: Omit<HelpRequest, 'id' | 'priority' | 'createdAt' | 'resourcesNeeded'>): string => {
      const tempId = `REQ-${String(reqCounter).padStart(4, '0')}`;
      dispatch({ type: 'CREATE_REQUEST', payload: data });
      return tempId;
    },
    [],
  );

  const assignVolunteer = useCallback((requestId: string, volunteerId: string) => {
    dispatch({ type: 'ASSIGN_VOLUNTEER', requestId, volunteerId });
  }, []);

  const updateStatus = useCallback((requestId: string, status: HelpRequest['status']) => {
    dispatch({ type: 'UPDATE_STATUS', requestId, status });
  }, []);

  const broadcastAlert = useCallback((message: string) => {
    dispatch({ type: 'BROADCAST_ALERT', message });
  }, []);

  const toggleOnline = useCallback((value: boolean) => {
    dispatch({ type: 'TOGGLE_ONLINE', value });
  }, []);

  const syncPending = useCallback(() => {
    dispatch({ type: 'SYNC_PENDING' });
    localStorage.removeItem('sahayaknet_pending');
  }, []);

  return (
    <AppContext.Provider
      value={{ state, dispatch, createRequest, assignVolunteer, updateStatus, broadcastAlert, toggleOnline, syncPending }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
