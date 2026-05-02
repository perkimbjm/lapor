import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase';

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * The Supabase query builder is highly generic; we type it loosely so callers
 * can chain `.eq()`, `.order()`, `.limit()`, etc. without us having to mirror
 * PostgrestFilterBuilder's complex generic signature.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryBuilder = any;

export interface UseSupabaseQueryOptions<T> {
  /** Supabase table name */
  table: string;

  /** Columns to select (default: '*') */
  select?: string;

  /**
   * Apply filters / ordering to the query builder.
   * Called with the initial query, return the modified query.
   * Example: `(q) => q.eq('status', 'active').order('created_at', { ascending: false })`
   */
  filter?: (query: QueryBuilder) => QueryBuilder;

  /**
   * Realtime subscription mode (default: 'realtime').
   * - `'realtime'` — Supabase Realtime channel (postgres_changes)
   * - `'poll'`     — setInterval polling
   * - `'none'`     — one-time fetch only
   */
  realtimeMode?: 'realtime' | 'poll' | 'none';

  /** Polling interval in ms (only used when realtimeMode = 'poll'). Default: 6000 */
  pollInterval?: number;

  /** Debounce interval in ms for realtime refetches. Default: 300 */
  debounceMs?: number;

  /**
   * When false, the query is skipped entirely (no fetch, no subscription).
   * Useful when a required dependency (e.g. user) is not yet available.
   * Default: true
   */
  enabled?: boolean;

  /** Transform raw rows before setting state. Runs on every fetch. */
  transform?: (data: unknown[]) => T[];

  /**
   * Additional Supabase Realtime tables to listen to.
   * When any of these tables change, the main query is re-fetched.
   * Useful when your data depends on join tables (e.g. role_permissions).
   */
  extraTables?: string[];

  /** Unique channel suffix — prevents collisions when the same table is queried
   *  by multiple hooks on different pages. Auto-generated if omitted. */
  channelName?: string;
}

export interface UseSupabaseQueryResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  /** Manually re-fetch data */
  refetch: () => Promise<void>;
}

// ── Hook Implementation ──────────────────────────────────────────────────────

let channelCounter = 0;

export function useSupabaseQuery<T = any>(
  options: UseSupabaseQueryOptions<T>,
): UseSupabaseQueryResult<T> {
  const {
    table,
    select = '*',
    filter,
    realtimeMode = 'realtime',
    pollInterval = 6000,
    debounceMs = 300,
    enabled = true,
    transform,
    extraTables = [],
    channelName,
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep refs to latest options so the fetch callback is always current
  const filterRef = useRef(filter);
  filterRef.current = filter;
  const transformRef = useRef(transform);
  transformRef.current = transform;

  const fetchData = useCallback(async () => {
    try {
      let query: QueryBuilder = supabase.from(table).select(select);

      if (filterRef.current) {
        query = filterRef.current(query);
      }

      const { data: rows, error: fetchError } = await query;

      if (fetchError) {
        console.error(`[useSupabaseQuery] Error fetching "${table}":`, fetchError);
        setError(fetchError.message);
        return;
      }

      const result = (rows ?? []) as unknown[];
      setData(transformRef.current ? transformRef.current(result) : (result as T[]));
      setError(null);
    } catch (err: unknown) {
      console.error(`[useSupabaseQuery] Unexpected error for "${table}":`, err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [table, select]);

  // ── Initial fetch ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const init = async () => {
      setLoading(true);
      await fetchData();
      if (!cancelled) setLoading(false);
    };

    init();

    return () => { cancelled = true; };
  }, [enabled, fetchData]);

  // ── Realtime / Polling subscription ──────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    // ── Poll mode ──────────────────────────────────────────────────────────
    if (realtimeMode === 'poll') {
      const interval = setInterval(() => { fetchData(); }, pollInterval);
      return () => clearInterval(interval);
    }

    // ── Realtime mode ──────────────────────────────────────────────────────
    if (realtimeMode === 'realtime') {
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;

      const debouncedFetch = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => { fetchData(); }, debounceMs);
      };

      const name = channelName ?? `sq-${table}-${++channelCounter}`;
      let channel = supabase
        .channel(name)
        .on('postgres_changes', { event: '*', schema: 'public', table }, debouncedFetch);

      // Subscribe to extra tables (e.g. role_permissions alongside roles)
      for (const extra of extraTables) {
        channel = channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table: extra },
          debouncedFetch,
        );
      }

      channel.subscribe();

      return () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        supabase.removeChannel(channel);
      };
    }

    // realtimeMode === 'none' — no subscription
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, realtimeMode, pollInterval, debounceMs, table, channelName]);

  return { data, loading, error, refetch: fetchData };
}
