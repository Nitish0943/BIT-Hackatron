// AI Logic Engine – SahayakNet
// Priority scoring, duplicate detection, resource calculation, demand prediction

import { HelpRequest, Volunteer, Resource, RequestCategory } from './mockData';

// ─── Priority Scoring ─────────────────────────────────────────────────────────
const SEVERITY_MAP: Record<RequestCategory, number> = {
  medical: 50,
  rescue: 40,
  food: 30,
  water: 20,
  shelter: 10,
};

export function computePriority(
  category: RequestCategory,
  familySize: number,
  createdAt: string,
): number {
  const waitingHours = (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
  const severity = SEVERITY_MAP[category];
  const familyBonus = familySize * 2;
  const waitBonus = Math.min(Math.floor(waitingHours / 4) * 3, 30); // cap at 30
  return severity + familyBonus + waitBonus;
}

// ─── Duplicate Detection ──────────────────────────────────────────────────────
export function findDuplicate(
  newReq: Pick<HelpRequest, 'location' | 'category' | 'phone'>,
  existing: HelpRequest[],
): HelpRequest | null {
  const DISTANCE_THRESHOLD = 0.005; // ~500m in lat/lng degrees

  for (const req of existing) {
    // Same phone → definitely same person
    if (req.phone === newReq.phone && req.category === newReq.category) return req;

    // Same category + location within threshold
    const latDiff = Math.abs(req.location.lat - newReq.location.lat);
    const lngDiff = Math.abs(req.location.lng - newReq.location.lng);
    if (latDiff < DISTANCE_THRESHOLD && lngDiff < DISTANCE_THRESHOLD && req.category === newReq.category) {
      return req;
    }
  }
  return null;
}

// ─── Resource Calculation ─────────────────────────────────────────────────────
export function calculateResources(
  category: RequestCategory,
  familySize: number,
): Record<string, number> {
  return {
    food_packets: familySize * 3,
    water_liters: familySize * 5,
    medicine_kits: category === 'medical' ? Math.ceil(familySize / 2) : 0,
    shelter_units: category === 'shelter' ? Math.ceil(familySize / 4) : 0,
    rescue_boats: category === 'rescue' ? 1 : 0,
  };
}

// ─── Demand Prediction ────────────────────────────────────────────────────────
export interface DepletionForecast {
  resourceName: string;
  available: number;
  unit: string;
  daysUntilDepletion: number | null; // null = unlimited
  isUrgent: boolean;
}

export function predictDepletion(resources: Resource[]): DepletionForecast[] {
  return resources.map((r) => {
    if (r.dailyConsumption === 0) {
      return { resourceName: r.name, available: r.available, unit: r.unit, daysUntilDepletion: null, isUrgent: false };
    }
    const days = parseFloat((r.available / r.dailyConsumption).toFixed(1));
    return {
      resourceName: r.name,
      available: r.available,
      unit: r.unit,
      daysUntilDepletion: days,
      isUrgent: days <= 3,
    };
  });
}

// ─── Nearest Volunteer ────────────────────────────────────────────────────────
export function findNearestVolunteer(
  request: HelpRequest,
  volunteers: Volunteer[],
): Volunteer | null {
  const available = volunteers.filter((v) => v.status === 'available');
  if (!available.length) return null;

  let nearest: Volunteer | null = null;
  let minDist = Infinity;

  for (const v of available) {
    const dist =
      Math.pow(v.location.lat - request.location.lat, 2) +
      Math.pow(v.location.lng - request.location.lng, 2);
    if (dist < minDist) {
      minDist = dist;
      nearest = v;
    }
  }
  return nearest;
}

// ─── IVR / Multi-channel request parser ───────────────────────────────────────
export function parseWhatsAppMessage(text: string): RequestCategory | null {
  const lower = text.toLowerCase();
  if (lower.includes('medical') || lower.includes('medicine') || lower.includes('doctor') || lower.includes('hospital')) return 'medical';
  if (lower.includes('rescue') || lower.includes('trapped') || lower.includes('stuck') || lower.includes('drown')) return 'rescue';
  if (lower.includes('food') || lower.includes('hungry') || lower.includes('eat')) return 'food';
  if (lower.includes('water') || lower.includes('drink')) return 'water';
  if (lower.includes('shelter') || lower.includes('house') || lower.includes('roof') || lower.includes('stay')) return 'shelter';
  return 'food'; // default
}

export function ivrCodeToCategory(code: string): RequestCategory {
  const map: Record<string, RequestCategory> = {
    '1': 'food',
    '2': 'medical',
    '3': 'rescue',
    '4': 'water',
    '5': 'shelter',
  };
  return map[code] ?? 'food';
}
