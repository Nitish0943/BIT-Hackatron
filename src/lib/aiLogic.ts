import { HelpRequest, RequestCategory, Resource, Volunteer } from './mockData';

export interface DepletionForecast {
  resourceName: string;
  available: number;
  total: number;
  percent: number;
  isUrgent: boolean;
}

const SEVERITY_MAP: Record<RequestCategory, number> = {
  medical: 50,
  rescue: 45,
  food: 30,
  shelter: 20,
};

export function computePriority(category: RequestCategory, people: number, createdAt: string): number {
  const severity = SEVERITY_MAP[category];
  const peopleScore = Math.max(1, people) * 2;
  const waitingHours = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 3_600_000));
  const waitingScore = Math.min(waitingHours * 2, 30);
  return severity + peopleScore + waitingScore;
}

export function priorityLevel(priority: number): 'high' | 'medium' | 'low' {
  if (priority >= 60) return 'high';
  if (priority >= 40) return 'medium';
  return 'low';
}

export interface RequestCluster {
  id: string;
  lat: number;
  lng: number;
  count: number;
  high: number;
  medium: number;
  low: number;
}

export function clusterNearbyRequests(requests: HelpRequest[]): RequestCluster[] {
  const clusters: RequestCluster[] = [];
  const threshold = 0.08;
  requests.forEach((req) => {
    const existing = clusters.find(
      (cluster) =>
        Math.abs(cluster.lat - req.lat) < threshold &&
        Math.abs(cluster.lng - req.lng) < threshold,
    );
    const level = priorityLevel(req.priority);
    if (existing) {
      existing.count += 1;
      existing[level] += 1;
    } else {
      clusters.push({
        id: `cluster-${clusters.length + 1}`,
        lat: req.lat,
        lng: req.lng,
        count: 1,
        high: level === 'high' ? 1 : 0,
        medium: level === 'medium' ? 1 : 0,
        low: level === 'low' ? 1 : 0,
      });
    }
  });
  return clusters;
}

export function suggestNearestVolunteer(request: HelpRequest, volunteers: Volunteer[]): Volunteer | null {
  const available = volunteers.filter((vol) => vol.availability === 'available');
  if (!available.length) return null;
  let best: Volunteer | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  available.forEach((vol) => {
    const distance = Math.sqrt((vol.lat - request.lat) ** 2 + (vol.lng - request.lng) ** 2);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = vol;
    }
  });
  return best;
}

export function predictDepletion(resources: Resource[]): DepletionForecast[] {
  return resources.map((resource) => {
    const pct = Math.round((resource.available / Math.max(resource.total, 1)) * 100);
    return {
      resourceName: resource.name,
      available: resource.available,
      total: resource.total,
      percent: pct,
      isUrgent: pct < 30,
    };
  });
}

export function parseWhatsAppMessage(text: string): RequestCategory {
  const lower = text.toLowerCase();
  if (lower.includes('medical') || lower.includes('doctor') || lower.includes('medicine')) return 'medical';
  if (lower.includes('rescue') || lower.includes('trapped') || lower.includes('stuck')) return 'rescue';
  if (lower.includes('shelter') || lower.includes('house') || lower.includes('camp')) return 'shelter';
  return 'food';
}

export function ivrCodeToCategory(code: string): RequestCategory {
  const map: Record<string, RequestCategory> = {
    '1': 'food',
    '2': 'medical',
    '3': 'rescue',
    '4': 'shelter',
  };
  return map[code] ?? 'food';
}
