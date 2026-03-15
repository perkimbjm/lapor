
import { Complaint, ComplaintStatus, RoadType, Material, Equipment, Worker, AttendanceRecord } from './types';

export const MOCK_COMPLAINTS: Complaint[] = [
  {
    id: '1',
    ticketNumber: 'PJJ-2023-001',
    category: RoadType.JALAN,
    description: 'Lubang besar di tengah jalan, sangat berbahaya bagi pengendara motor.',
    location: 'Jl. Lambung Mangkurat, Banjarmasin Tengah',
    lat: -3.3194,
    lng: 114.5928,
    status: ComplaintStatus.PENDING,
    reporterName: 'Budi Santoso',
    dateSubmitted: '2023-10-25T08:30:00',
    dateUpdated: '2023-10-25T08:30:00',
    imageUrl: 'https://picsum.photos/800/600?random=1',
  },
];

export const MOCK_MATERIALS: Material[] = [
  { id: 'm1', name: 'Aspal Cold Mix', unit: 'Sak (25kg)', currentStock: 150, minThreshold: 50, lastUpdated: '2023-10-26' },
  { id: 'm2', name: 'Semen Portland', unit: 'Sak (50kg)', currentStock: 30, minThreshold: 40, lastUpdated: '2023-10-25' },
];

export const MOCK_EQUIPMENT: Equipment[] = [
  { id: 'e1', name: 'Baby Roller Komatsu', type: 'Pemadat', category: 'Heavy', status: 'Tersedia', assignedToJobId: '2' },
  { id: 'e2', name: 'Dump Truck Isuzu A', type: 'Transport', category: 'Heavy', status: 'Tersedia' },
];

export const MOCK_WORKERS: Worker[] = [
  { id: 'w1', name: 'Ahmad Subarjo', category: RoadType.JALAN, dailyRate: 150000, otRate: 75000 },
  { id: 'w2', name: 'Siti Rohani', category: RoadType.JALAN, dailyRate: 150000, otRate: 75000 },
  { id: 'w3', name: 'Bambang Tri', category: RoadType.JALAN, dailyRate: 150000, otRate: 75000 },
  { id: 'w4', name: 'Heri Kusuma', category: RoadType.JEMBATAN, dailyRate: 175000, otRate: 85000 },
  { id: 'w5', name: 'Zulkipli', category: RoadType.JEMBATAN, dailyRate: 175000, otRate: 85000 },
];

export const MOCK_ATTENDANCE: AttendanceRecord[] = [
  { 
    id: 'a1', 
    workerId: 'w1', 
    month: '2024-03', 
    week: 1, 
    presence: { monday: 1, tuesday: 1, wednesday: 1, thursday: 2, friday: 1, saturday: 1, sunday: 0 } 
  },
  { 
    id: 'a2', 
    workerId: 'w2', 
    month: '2024-03', 
    week: 1, 
    presence: { monday: 1, tuesday: 1, wednesday: 1, thursday: 1, friday: 1, saturday: 0, sunday: 0 } 
  },
  { 
    id: 'a3', 
    workerId: 'w4', 
    month: '2024-03', 
    week: 1, 
    presence: { monday: 1, tuesday: 2, wednesday: 2, thursday: 1, friday: 1, saturday: 1, sunday: 0 } 
  },
];

export const MOCK_COST_REPORTS = [
  { month: 'Jan', estimasi: 40000000, realisasi: 38500000 },
  { month: 'Feb', estimasi: 35000000, realisasi: 32000000 },
  { month: 'Mar', estimasi: 50000000, realisasi: 48000000 },
];

export const COST_BY_CATEGORY = [
  { name: 'Material', value: 120000000 },
  { name: 'Upah Kerja', value: 80000000 },
  { name: 'BBM & Transport', value: 45000000 },
];
