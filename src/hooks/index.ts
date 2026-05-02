// ── Generic Supabase hooks ───────────────────────────────────────────────────
export { useSupabaseQuery } from './useSupabaseQuery';
export type { UseSupabaseQueryOptions, UseSupabaseQueryResult } from './useSupabaseQuery';

export { useSupabaseSingle } from './useSupabaseSingle';
export type { UseSupabaseSingleOptions, UseSupabaseSingleResult } from './useSupabaseSingle';

// ── Workforce hook ────────────────────────────────────────────────────────────
export { useWorkforceData, getWeekDates } from './useWorkforceData';
export type {
  WorkforceRates,
  WorkerFormData,
  ChartEntry,
  DayKey,
} from './useWorkforceData';

// ── Existing hooks ───────────────────────────────────────────────────────────
export { useConnectionRecovery } from './useConnectionRecovery';
