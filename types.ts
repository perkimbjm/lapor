
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
  ticket_number: string;
  category: RoadType;
  description: string;
  location: string;
  lat?: number;
  lng?: number;
  status: ComplaintStatus;
  priority?: PriorityLevel; 
  reporter_name: string;
  reporter_phone: string;
  date_submitted: string;
  date_updated: string;
  date_created?: string;
  created_at?: any;
  image_url?: string;
  rejection_reason?: string;
  survey_date?: string;
  completion_date?: string;
  notes?: string;
}

export interface Material {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_threshold: number;
  last_updated: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: string;
  category: 'Heavy' | 'Tool';
  status: 'Tersedia' | 'Perbaikan';
  assigned_to_job_id?: string;
}

export interface Worker {
  id: string;
  name: string;
  category: RoadType;
  daily_rate?: number;
  ot_rate_1?: number;
  ot_rate_2?: number;
  ot_rate_3?: number;
}

export interface Holiday {
  id: string;
  date: string; // ISO format YYYY-MM-DD
  name: string;
  type: 'National' | 'Cuti Bersama';
}

export interface AttendanceRecord {
  id: string;
  worker_id: string;
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

export interface Permission {
  id: string;
  name: string;
  code: string;
  description: string;
  feature: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'reset_password' | 'ban_user';
}

export interface Role {
  id: string;
  name: string;
  description: string;
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
}

export interface AppUser {
  id: string;
  email: string;
  username?: string;
  phone?: string;
  display_name?: string;
  role_id: string;
  is_banned?: boolean;
  created_at: string;
}

