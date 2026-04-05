const API_BASE = 'http://10.252.111.61:8000';

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `API error ${res.status}`);
    }
    return res.json();
  } catch (error) {
    console.error(`API Call failed: ${path}`, error);
    throw error;
  }
}

export type HelpRequest = {
  id: string;
  name: string;
  phone: string;
  category: string;
  people: number;
  location: string;
  zone: string;
  status: 'pending' | 'assigned' | 'completed';
  executionStatus?: string;
  createdAt: string;
  assignedVolunteerId?: string;
  assignedVolunteerName?: string;
  eta?: string;
  priority: number;
  lat: number;
  lng: number;
  sms_status?: 'not_required' | 'pending' | 'sent' | 'failed';
};

export type Volunteer = {
  id: string;
  name: string;
  phone: string;
  lat: number;
  lng: number;
  availability: string;
  image: string;
  skills: string[];
};

export type DashboardData = {
  requests: HelpRequest[];
  volunteers: Volunteer[];
  stats: any;
};

export const api = {
  getRequests: () => call<HelpRequest[]>('/requests'),
  getRequestById: (id: string) => call<HelpRequest>(`/request/${id}`),
  getDashboard: () => call<DashboardData>('/dashboard?compact=1'),
  createRequest: (payload: any) => call<HelpRequest>('/request', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  assignRequest: (requestId: string, volunteerId: string) => call<any>('/assign', {
    method: 'POST',
    body: JSON.stringify({ request_id: requestId, volunteer_id: volunteerId }),
  }),
  startMission: (requestId: string, volunteerId: string) => call<any>('/mission/start', {
    method: 'POST',
    body: JSON.stringify({ request_id: requestId, volunteer_id: volunteerId }),
  }),
  completeRequest: (requestId: string) => call<any>('/complete', {
    method: 'POST',
    body: JSON.stringify({ request_id: requestId }),
  }),
  setAvailability: (volunteerId: string, availability: string) => call<any>('/volunteer/status', {
    method: 'POST',
    body: JSON.stringify({ volunteer_id: volunteerId, availability }),
  }),
};
