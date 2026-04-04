import { DashboardData, HelpRequest } from './mockData';

const API_BASE = 'http://localhost:8000';

async function call<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(`${API_BASE}${path}`, {
		...init,
		headers: {
			'Content-Type': 'application/json',
			...(init?.headers || {}),
		},
		cache: 'no-store',
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(text || `API error ${res.status}`);
	}
	return res.json();
}

export function getRequests(): Promise<HelpRequest[]> {
	return call<HelpRequest[]>('/requests');
}

export function getDashboard(): Promise<DashboardData> {
	return call<DashboardData>('/dashboard');
}

export function createRequest(payload: {
	name: string;
	phone: string;
	category: 'food' | 'medical' | 'rescue' | 'shelter';
	people: number;
	location: string;
	zone: string;
}) {
	return call<HelpRequest>('/requests', {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}

export function assignVolunteer(payload: { request_id: string; volunteer_id: string }) {
	return call<{ success: boolean; request: HelpRequest }>('/assign', {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}

export function completeRequest(payload: { request_id: string }) {
	return call<{ success: boolean; request: HelpRequest }>('/complete', {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}

export function updatePriority(payload: { request_id: string; priority: number }) {
	return call<{ success: boolean; request: HelpRequest }>('/priority', {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}
