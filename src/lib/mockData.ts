export type RequestCategory = 'food' | 'medical' | 'rescue' | 'shelter';
export type RequestStatus = 'pending' | 'assigned' | 'completed';

export interface HelpRequest {
  id: string;
  name: string;
  phone: string;
  category: RequestCategory;
  status: RequestStatus;
  people: number;
  location: string;
  zone: string;
  lat: number;
  lng: number;
  priority: number;
  createdAt: string;
  assignedVolunteerId?: string | null;
  assignedVolunteerName?: string | null;
}

export interface Volunteer {
  id: string;
  name: string;
  phone: string;
  skills: string[];
  vehicle: boolean;
  availability: 'available' | 'busy';
  zone: string;
  image: string;
  idCard: string;
  lat: number;
  lng: number;
  tasksCompleted: number;
}

export interface Resource {
  name: string;
  total: number;
  available: number;
}

export interface DashboardSummary {
  totalRequests: number;
  activeRequests: number;
  criticalRequests: number;
  completedRequests: number;
  volunteersAvailable: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  resources: Resource[];
  alerts: string[];
  volunteers: Volunteer[];
  requests: HelpRequest[];
}

export const JHARKHAND_CENTER: [number, number] = [23.61, 85.28];

export const FALLBACK_DASHBOARD: DashboardData = {
  summary: {
    totalRequests: 0,
    activeRequests: 0,
    criticalRequests: 0,
    completedRequests: 0,
    volunteersAvailable: 0,
  },
  resources: [],
  alerts: [],
  volunteers: [],
  requests: [],
};
