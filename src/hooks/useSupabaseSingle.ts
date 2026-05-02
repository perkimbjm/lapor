import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase';

// ── Types ────────────────────────────────────────────────────────────────────

export interface UseSupabaseSingleOptions<T> {
  /** Supabase table name */
  table: string;

  /** Columns to select (default: '*') */
  select?: string;

  /**
   * Apply filters to narrow the query to a single row.
   * Example: `(q) => q.eq('id', 'workforce_rates')`
   */
  filter: (query: any) => any;

  /** When false, the query is skipped. Default: true */
  enabled?: boolean;

  /** Fallback value used when no row is found or before fetch completes */
  defaultValue: T;

  /** Transform the raw row before setting state */
  transform?: (row: any) => T;
}

export interface UseSupabaseSingleResult<T> {
  data: T;
  loading: boolean;
  error: string | null;
  /** Whether a row was found */
  found: boolean;
  refetch: () => Promise<void>;
}

// ── Hook Implementation ──────────────────────────────────────────────────────

export function useSupabaseSingle<T>(
  options: UseSupabaseSingleOptions<T>,
): UseSupabaseSingleResult<T> {
  const {
    table,
    select = '*',
    filter,
    enabled = true,
    defaultValue,
    transform,
  } = options;

  const [data, setData] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState(false);

  const filterRef = useRef(filter);
  filterRef.current = filter;
  const transformRef = useRef(transform);
  transformRef.current = transform;

  const fetchData = useCallback(async () => {
    try {
      let query = supabase.from(table).select(select);
      query = filterRef.current(query);

      const { data: row, error: fetchError } = await query.single();

      if (fetchError) {
        // PGRST116 = "no rows returned" — not a real error, just empty
        if (fetchError.code === 'PGRST116') {
          setFound(false);
          setError(null);
          return;
        }
        console.error(`[useSupabaseSingle] Error fetching "${table}":`, fetchError);
        setError(fetchError.message);
        return;
      }

      if (row) {
        setData(transformRef.current ? transformRef.current(row) : (row as T));
        setFound(true);
      } else {
        setFound(false);
      }
      setError(null);
    } catch (err: any) {
      console.error(`[useSupabaseSingle] Unexpected error for "${table}":`, err);
      setError(err?.message ?? 'Unknown error');
    }
  }, [table, select]);

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

  return { data, loading, error, found, refetch: fetchData };
}
