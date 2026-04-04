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
  source?: 'web' | 'ivr' | 'whatsapp' | 'missed_call' | 'drone';
  mergedCount?: number;
  duplicateOf?: string | null;
  priorityReason?: string;
  resourceSummary?: string;
  eta?: string | null;
  resourcesNeeded?: {
    food_packets?: number;
    water_liters?: number;
    medicine_kits?: number;
    shelter_units?: number;
    rescue_boats?: number;
  };
}

export interface Volunteer {
  id: string;
  name: string;
  age?: number;
  phone: string;
  skills: string[];
  vehicle: boolean;
  availability: 'available' | 'busy' | 'inactive';
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
  unit?: string;
  dailyConsumption?: number;
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
  missions?: Array<{
    id: string;
    requestId: string;
    volunteerId: string;
    status: 'assigned' | 'completed';
    createdAt: string;
    completedAt?: string | null;
  }>;
  camps?: Array<{
    id: string;
    name: string;
    zone: string;
    capacity: number;
    occupied: number;
  }>;
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
  missions: [],
  camps: [],
};
