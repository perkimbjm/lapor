import { ComplaintStatus } from './types';

// ── Cost ─────────────────────────────────────────────────────────────────────

export const COST_BY_CATEGORY = [
  { name: 'Material', value: 120000000 },
  { name: 'Upah Kerja', value: 80000000 },
  { name: 'BBM & Transport', value: 45000000 },
];

// ── Feature & Permission Constants (RBAC) ────────────────────────────────────
// Single source of truth — used by RoleManagement & PermissionManagement

export type FeatureId =
  | 'DASHBOARD' | 'COMPLAINTS' | 'MAP' | 'INVENTORY' | 'EQUIPMENT'
  | 'WORKFORCE' | 'REPORTS' | 'CMS' | 'USERS' | 'ROLES'
  | 'PERMISSIONS' | 'NOTIFICATIONS' | 'AUDIT_LOG';

export type ActionId =
  | 'read' | 'create' | 'update' | 'delete'
  | 'reset_password' | 'ban_user'
  | 'manage_rates' | 'manage_excel' | 'manage_holidays';

export interface FeatureDefinition {
  id: FeatureId;
  name: string;
}

export interface ActionDefinition {
  id: ActionId;
  /** Short label for compact matrix (R, C, U, D, MR, ...) */
  shortLabel: string;
  /** Full human-readable label */
  label: string;
  /** Tailwind color classes for PermissionManagement cards */
  color: string;
}

export const FEATURES: FeatureDefinition[] = [
  { id: 'DASHBOARD',     name: 'Dashboard' },
  { id: 'COMPLAINTS',    name: 'Daftar Aduan' },
  { id: 'MAP',           name: 'Peta Sebaran' },
  { id: 'INVENTORY',     name: 'Stok Material' },
  { id: 'EQUIPMENT',     name: 'Armada & Peralatan' },
  { id: 'WORKFORCE',     name: 'Tenaga Kerja' },
  { id: 'REPORTS',       name: 'Laporan & Biaya' },
  { id: 'CMS',           name: 'CMS Landing Page' },
  { id: 'USERS',         name: 'Manajemen User' },
  { id: 'ROLES',         name: 'Manajemen Role' },
  { id: 'PERMISSIONS',   name: 'Manajemen Izin' },
  { id: 'NOTIFICATIONS', name: 'Notifikasi' },
  { id: 'AUDIT_LOG',     name: 'Audit Log' },
];

export const ACTIONS: ActionDefinition[] = [
  { id: 'read',            shortLabel: 'R',  label: 'Melihat Data',           color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' },
  { id: 'create',          shortLabel: 'C',  label: 'Menambahkan Data',       color: 'text-green-600 bg-green-50 dark:bg-green-900/30' },
  { id: 'update',          shortLabel: 'U',  label: 'Update/Edit Data',       color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30' },
  { id: 'delete',          shortLabel: 'D',  label: 'Menghapus Data',         color: 'text-red-600 bg-red-50 dark:bg-red-900/30' },
  { id: 'reset_password',  shortLabel: 'RP', label: 'Reset Password',         color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30' },
  { id: 'ban_user',        shortLabel: 'BU', label: 'Banned User',            color: 'text-slate-600 bg-slate-50 dark:bg-slate-900/30' },
  { id: 'manage_rates',    shortLabel: 'MR', label: 'Kelola Tarif Upah',      color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' },
  { id: 'manage_excel',    shortLabel: 'MX', label: 'Kelola Excel & Template', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' },
  { id: 'manage_holidays', shortLabel: 'MH', label: 'Kelola Hari Libur',      color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/30' },
];

/** Actions that only apply to the WORKFORCE feature */
export const WORKFORCE_ONLY_ACTIONS: ActionId[] = ['manage_rates', 'manage_excel', 'manage_holidays'];

/** Actions that only apply to the USERS feature */
export const USERS_ONLY_ACTIONS: ActionId[] = ['reset_password', 'ban_user'];

// ── Chart Colors ─────────────────────────────────────────────────────────────

export const CHART_COLORS = {
  STATUS:   ['#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#f59e0b'],
  CATEGORY: ['#0ea5e9', '#6366f1'],
  GENERAL:  ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
};

// ── Complaint Status Colors (hex — for map markers, charts, etc.) ────────────

export const STATUS_COLORS: Record<string, string> = {
  [ComplaintStatus.PENDING]:   '#f97316',
  [ComplaintStatus.RECEIVED]:  '#3b82f6',
  [ComplaintStatus.REJECTED]:  '#ef4444',
  [ComplaintStatus.SURVEY]:    '#8b5cf6',
  [ComplaintStatus.COMPLETED]: '#22c55e',
};

export const STATUS_LABELS: Record<string, string> = {
  [ComplaintStatus.PENDING]:   'Belum Dikerjakan',
  [ComplaintStatus.RECEIVED]:  'Diterima',
  [ComplaintStatus.REJECTED]:  'Tidak Diterima',
  [ComplaintStatus.SURVEY]:    'Disurvey',
  [ComplaintStatus.COMPLETED]: 'Selesai Dikerjakan',
};

// ── Workforce Default Rates ──────────────────────────────────────────────────

export const DEFAULT_WORKFORCE_RATES: {
  dailyRate: number;
  otRate1: number;
  otRate2: number;
  otRate3: number;
} = {
  dailyRate: 170_000,
  otRate1:   240_000,
  otRate2:   290_000,
  otRate3:   340_000,
};

// ── Map ──────────────────────────────────────────────────────────────────────

/** Banjarmasin city center */
export const DEFAULT_MAP_CENTER = { lat: -3.3194, lng: 114.5908 } as const;

// ── Image Upload ─────────────────────────────────────────────────────────────

export const IMAGE_MAX_SIZE_MB = 5;
export const IMAGE_COMPRESS_TARGET_MB = 1;

// ── Superadmin ───────────────────────────────────────────────────────────────

export const SUPERADMIN_EMAIL = import.meta.env.VITE_SUPERADMIN_EMAIL ?? 'denip23147@gmail.com';

// ── Utility Functions ────────────────────────────────────────────────────────

export const formatRupiah = (value: number): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export const generateTicketNumber = (): string => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  return `ADU-${date}-${rand}`;
};
