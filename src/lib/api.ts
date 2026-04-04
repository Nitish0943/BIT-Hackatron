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

export function getRequestById(requestId: string): Promise<HelpRequest> {
	return call<HelpRequest>(`/request/${requestId}`);
}

export function getVolunteers(): Promise<any[]> {
	return call<any[]>('/volunteers');
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
	source?: 'web' | 'ivr' | 'whatsapp' | 'missed_call' | 'drone';
}) {
	return call<HelpRequest>('/request', {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}

export function createVolunteer(payload: {
	name: string;
	phone: string;
	skills: string[];
	vehicle: boolean;
	zone: string;
	availability?: 'available' | 'busy';
	lat?: number;
	lng?: number;
	image?: string;
	idCard?: string;
}) {
	return call('/volunteer', {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}

export function setVolunteerStatus(payload: {
	volunteer_id: string;
	availability: 'available' | 'busy' | 'inactive';
}) {
	return call('/volunteer/status', {
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

export function createIvrRequest(payload: { phone: string; digit: string; location?: string; zone?: string }) {
	return call<HelpRequest>('/ivr', {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}

export function createWhatsAppRequest(payload: { phone: string; message: string; location?: string; zone?: string }) {
	return call<HelpRequest>('/whatsapp', {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}

export function createMissedCallRequest(payload: { phone?: string; location?: string; zone?: string }) {
	return call<HelpRequest>('/missed-call', {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}

export function createDroneRequest(payload: {
	id?: string;
	lat?: number;
	lng?: number;
	persons?: number;
	flag?: 'red' | 'yellow' | 'green';
	area?: string;
	zone?: string;
}) {
	return call<HelpRequest>('/drone', {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}

export function mergeDuplicateRequest(payload: {
	name: string;
	phone: string;
	category: 'food' | 'medical' | 'rescue' | 'shelter';
	people: number;
	location: string;
	zone: string;
	source?: 'web' | 'ivr' | 'whatsapp' | 'missed_call' | 'drone';
}) {
	return createRequest(payload);
}

export function createBroadcastAlert(payload: {
	message: string;
	channels?: Array<'sms' | 'ivr' | 'whatsapp'>;
}) {
	return call<{ success: boolean; message: string; meta: { sentTo: number; channels: string[]; delivery: string }; feed: string }>('/alerts', {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}
