
export enum ComplaintStatus {
  PENDING = 'Belum dikerjakan',
  RECEIVED = 'Diterima',
  REJECTED = 'Tidak diterima',
  SURVEY = 'Disurvey',
  COMPLETED = 'Selesai dikerjakan',
}

export enum PriorityLevel {
  LOW = 'Rendah',
  MEDIUM = 'Sedang',
  HIGH = 'Tinggi',
  CRITICAL = 'Darurat',
}

export enum RoadType {
  JALAN = 'Jalan',
  JEMBATAN = 'Jembatan',
}

export interface Complaint {
  id: string;
  ticketNumber: string;
  category: RoadType;
  description: string;
  location: string;
  lat: number;
  lng: number;
  status: ComplaintStatus;
  priority?: PriorityLevel; 
  reporterName: string;
  dateSubmitted: string;
  dateUpdated: string;
  imageUrl: string;
  rejectionReason?: string;
  surveyDate?: string;
  completionDate?: string;
  notes?: string;
}

export interface Material {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minThreshold: number;
  lastUpdated: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: string;
  category: 'Heavy' | 'Tool';
  status: 'Tersedia' | 'Perbaikan';
  assignedToJobId?: string;
}

export interface Worker {
  id: string;
  name: string;
  category: RoadType;
  dailyRate: number;
  otRate: number;
}

export interface AttendanceRecord {
  id: string;
  workerId: string;
  month: string; // e.g., "2024-03"
  week: number; // 1-5
  presence: {
    monday: number; // 0, 1, or 2
    tuesday: number;
    wednesday: number;
    thursday: number;
    friday: number;
    saturday: number;
    sunday: number;
  };
}

export interface StatMetric {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}
