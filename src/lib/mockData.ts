// Mock data for SahayakNet – Multi-Channel AI Disaster Coordination System
// Scenario: Major flood event across coastal district

export type RequestCategory = 'food' | 'water' | 'medical' | 'rescue' | 'shelter';
export type RequestStatus = 'pending' | 'assigned' | 'completed';
export type RequestSource = 'web' | 'ivr' | 'missed_call' | 'whatsapp' | 'drone';

export interface HelpRequest {
  id: string;
  name: string;
  phone: string;
  category: RequestCategory;
  status: RequestStatus;
  location: { lat: number; lng: number; address: string };
  familySize: number;
  priority: number; // computed
  assignedVolunteerId?: string;
  assignedVolunteerName?: string;
  eta?: string;
  source: RequestSource;
  createdAt: string;
  description?: string;
  resourcesNeeded?: Record<string, number>;
  zone: string;
  isDuplicate?: boolean;
}

export interface Volunteer {
  id: string;
  name: string;
  age: number;
  phone: string;
  skills: string[];
  vehicle: boolean;
  location: { lat: number; lng: number };
  status: 'available' | 'busy' | 'offline';
  tasksCompleted: number;
  zone: string;
}

export interface Resource {
  name: string;
  total: number;
  available: number;
  unit: string;
  dailyConsumption: number;
}

// Central flood coordinates (coastal India simulation)
const BASE_LAT = 13.08;
const BASE_LNG = 80.27;

function rnd(base: number, spread: number): number {
  return parseFloat((base + (Math.random() - 0.5) * spread).toFixed(5));
}

const zones = ['Zone A – North', 'Zone B – East', 'Zone C – South', 'Zone D – West', 'Zone E – Central'];
const sources: RequestSource[] = ['web', 'ivr', 'missed_call', 'whatsapp', 'drone'];
const names = [
  'Ramesh Kumar', 'Priya Devi', 'Suresh Babu', 'Kavitha Nair', 'Mohan Das',
  'Lakshmi Pillai', 'Arun Krishnan', 'Parvati Singh', 'Venkat Rao', 'Sumathi Iyer',
  'Arjun Mehta', 'Deepa Chakraby', 'Rajan Verma', 'Anitha Shenoy', 'Vijay Malhotra',
  'Rekha Patel', 'Kiran Reddy', 'Sunita Gupta', 'Prakash Joshi', 'Leela Nambiar',
  'Sanjay Mishra', 'Meena Ravi', 'Gopal Tiwari', 'Radha Krishnan', 'Ashok Sahu',
  'Usha Menon', 'Dinesh Bhat', 'Geetha Sharma', 'Rajesh Yadav', 'Padma Swaminathan',
  'Harish Dubey', 'Saroja Pillai', 'Kartik Banerjee', 'Asha Naik', 'Vinod Chandra',
  'Indira Rangaswamy', 'Balu Krishnaswamy', 'Nalini Bose', 'Sunil Kapoor', 'Champa Devi',
  'Ravi Shankar', 'Savitha Murthy', 'Prakash Nair', 'Bhavani Subramanian', 'Ajay Saxena',
  'Malathi Raman', 'Suresh Pandey', 'Gowri Deshpande', 'Anil Bhattacharya', 'Jaya Krishnamurthy',
];
const categories: RequestCategory[] = ['food', 'water', 'medical', 'rescue', 'shelter'];
const statuses: RequestStatus[] = ['pending', 'assigned', 'completed'];

function createAt(hoursAgo: number): string {
  const d = new Date();
  d.setHours(d.getHours() - hoursAgo);
  return d.toISOString();
}

export const MOCK_REQUESTS: HelpRequest[] = names.map((name, i) => {
  const category = categories[i % 5];
  const familySize = Math.floor(Math.random() * 6) + 1;
  const waitingHours = Math.floor(Math.random() * 48);
  const status = statuses[Math.floor(Math.random() * 3)];

  // Priority: medical=5, rescue=4, food=3, water=2, shelter=1 + family_size + waiting
  const sevMap: Record<RequestCategory, number> = { medical: 5, rescue: 4, food: 3, water: 2, shelter: 1 };
  const priority = sevMap[category] * 10 + familySize * 2 + Math.floor(waitingHours / 6);

  const zone = zones[i % 5];
  return {
    id: `REQ-${String(i + 1).padStart(4, '0')}`,
    name,
    phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
    category,
    status,
    location: {
      lat: rnd(BASE_LAT, 0.15),
      lng: rnd(BASE_LNG, 0.15),
      address: `${zone}, Near Community Center, Tamil Nadu`,
    },
    familySize,
    priority,
    assignedVolunteerId: status !== 'pending' ? `VOL-${String((i % 20) + 1).padStart(3, '0')}` : undefined,
    assignedVolunteerName: status !== 'pending' ? names[19 - (i % 20)] : undefined,
    eta: status === 'assigned' ? `${Math.floor(Math.random() * 120) + 15} mins` : undefined,
    source: sources[i % 5],
    createdAt: createAt(waitingHours),
    description: `${category.charAt(0).toUpperCase() + category.slice(1)} required for ${familySize} family member(s). Flood situation critical.`,
    resourcesNeeded: {
      food_packets: category === 'food' ? familySize * 3 : familySize,
      water_liters: familySize * 5,
      medicine_kits: category === 'medical' ? Math.ceil(familySize / 2) : 0,
    },
    zone,
  };
});

const volunteerSkillSets = [
  ['First Aid', 'Swimming'],
  ['Boat Operation', 'Navigation'],
  ['Medical', 'CPR'],
  ['Cooking', 'Logistics'],
  ['Search & Rescue', 'Rope Rescue'],
  ['Driving', 'Coordination'],
  ['Communication', 'Ham Radio'],
  ['Doctor', 'Emergency Medicine'],
  ['Water Purification', 'Sanitation'],
  ['Counselling', 'Language'],
];

export const MOCK_VOLUNTEERS: Volunteer[] = Array.from({ length: 20 }, (_, i) => ({
  id: `VOL-${String(i + 1).padStart(3, '0')}`,
  name: names[names.length - 1 - i],
  age: 20 + Math.floor(Math.random() * 30),
  phone: `8${Math.floor(100000000 + Math.random() * 900000000)}`,
  skills: volunteerSkillSets[i % 10],
  vehicle: i % 3 !== 0,
  location: {
    lat: rnd(BASE_LAT, 0.12),
    lng: rnd(BASE_LNG, 0.12),
  },
  status: i < 12 ? 'available' : i < 16 ? 'busy' : 'offline',
  tasksCompleted: Math.floor(Math.random() * 15),
  zone: zones[i % 5],
}));

export const MOCK_RESOURCES: Resource[] = [
  { name: 'Food Packets', total: 5000, available: 2340, unit: 'packets', dailyConsumption: 480 },
  { name: 'Water Bottles (1L)', total: 10000, available: 4200, unit: 'bottles', dailyConsumption: 950 },
  { name: 'Medicine Kits', total: 800, available: 310, unit: 'kits', dailyConsumption: 65 },
  { name: 'Life Jackets', total: 300, available: 145, unit: 'pieces', dailyConsumption: 20 },
  { name: 'Rescue Boats', total: 50, available: 18, unit: 'boats', dailyConsumption: 0 },
  { name: 'Tents / Shelters', total: 400, available: 187, unit: 'units', dailyConsumption: 25 },
  { name: 'Blankets', total: 2000, available: 890, unit: 'pieces', dailyConsumption: 40 },
  { name: 'First Aid Boxes', total: 600, available: 220, unit: 'boxes', dailyConsumption: 30 },
];

export const MOCK_DISTRICTS = [
  { name: 'Chennai North', requests: 12, completed: 8, volunteers: 6, severity: 'high' },
  { name: 'Chennai South', requests: 9, completed: 5, volunteers: 4, severity: 'medium' },
  { name: 'Kancheepuram', requests: 15, completed: 3, volunteers: 3, severity: 'critical' },
  { name: 'Chengalpattu', requests: 7, completed: 6, volunteers: 5, severity: 'low' },
  { name: 'Tiruvallur', requests: 11, completed: 2, volunteers: 2, severity: 'high' },
];
