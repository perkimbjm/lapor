export const ComplaintStatus = {
  PENDING: 'Belum dikerjakan',
  RECEIVED: 'Diterima',
  REJECTED: 'Tidak diterima',
  SURVEY: 'Disurvey',
  COMPLETED: 'Selesai dikerjakan',
} as const;

export type ComplaintStatus = typeof ComplaintStatus[keyof typeof ComplaintStatus];

export enum PriorityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export const PriorityLabel = {
  LOW : 'Rendah',
  MEDIUM : 'Sedang',
  HIGH : 'Tinggi',
  CRITICAL : 'Darurat',
}

export enum RoadType {
  JALAN = 'Jalan',
  JEMBATAN = 'Jembatan',
}

export const RoadTypeLabel = {
  Jalan: 'Jalan',
  Jembatan: 'Jembatan',
};

/** Generic timestamp — Supabase usually returns ISO string, Firestore uses Timestamp */
export type FirestoreLikeDate =
  | string
  | number
  | Date
  | { toDate: () => Date }
  | { seconds: number; nanoseconds?: number }
  | null
  | undefined;

export interface Complaint {
  id: string;
  ticket_number: string;
  category: RoadType;
  description: string;
  location: string;
  landmark?: string;
  lat?: number;
  lng?: number;
  status: ComplaintStatus;
  priority?: PriorityLevel;
  reporter_name: string;
  reporter_phone: string;
  date_submitted: string;
  date_updated: string;
  date_created?: string;
  created_at?: FirestoreLikeDate;
  image_url?: string;
  rejection_reason?: string;
  survey_date?: string;
  completion_date?: string;
  notes?: string;
  /** Marks this complaint as imported via bulk excel upload */
  is_bulk?: boolean;
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
  worker_id?: string | null;
  is_banned?: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  title: string;

  ticket_number?: string;

  category?: RoadType;
  status?: ComplaintStatus;

  description?: string;
  /** Alternative description / message field used by some legacy notifications */
  message?: string;
  /** UI styling category (e.g. 'warning', 'success', 'info') */
  type?: 'warning' | 'success' | 'info' | string;

  location?: string;
  lat?: number;
  lng?: number;

  reporter_name?: string;
  reporter_phone?: string;

  read: boolean;

  timestamp: string;

  created_at?: string;
}

// ── Audit & Activity Logs ────────────────────────────────────────────────────

export type AuditActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'READ' | 'LOGIN' | 'LOGOUT' | string;

export interface AuditLogEntry {
  id: string;
  user_id?: string | null;
  user_email?: string | null;
  action: AuditActionType;
  module?: string;
  details?: string;
  timestamp: FirestoreLikeDate;
  metadata?: Record<string, unknown>;
}

// ── Reports / Finance ────────────────────────────────────────────────────────

export interface Commitment {
  id: string;
  name: string;
  vendor: string;
  pagu: number;
  commitment: number;
  created_at?: string;
  documentUrl?: string;
}

export interface EPurchasing {
  id: string;
  vendor: string;
  /** Item / package name */
  item: string;
  date: string;
  totalPrice: number;
  status: string;
  detail?: string;
  invoice_url?: string;
  invoice_path?: string;
  uploaded_at?: string;
  created_at?: string;
  // Optional government contract fields
  noKontrak?: string;
  namaPekerjaan?: string;
  nilai?: number;
  waktuPelaksanaan?: string;
  tglKontrak?: string;
  tglBerakhir?: string;
  documentUrl?: string;
}

export interface CostReport {
  id: string;
  /** YYYY-MM */
  month: string;
  category: string;
  /** Total realised cost */
  totalCost: number;
  /** Estimated cost (from form) */
  estimasi?: number;
  /** Realised cost (from form) */
  realisasi?: number;
  description: string;
  created_at?: string;
}

// ── Workforce-related auxiliary types ────────────────────────────────────────

export interface AttendanceRow {
  id: string;
  worker_id: string;
  month: string;
  week: number;
  /** Day-of-week → presence value (0/1/2). Usually flattened from Supabase columns. */
  monday?: number;
  tuesday?: number;
  wednesday?: number;
  thursday?: number;
  friday?: number;
  saturday?: number;
  sunday?: number;
  presence?: AttendanceRecord['presence'];
}

// ── CMS config ───────────────────────────────────────────────────────────────

export interface CmsRecord<T = Record<string, unknown>> {
  id: string;
  data: T;
  updated_at?: string;
}

// ── Generic row-with-id helper ───────────────────────────────────────────────

export interface WithId {
  id: string;
}