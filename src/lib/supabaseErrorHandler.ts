// src/lib/supabaseErrorHandler.ts
// Pengganti firestoreErrorHandler.ts

import { supabase } from '../supabase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

/** Minimal shape we need from a Supabase / Postgrest error. */
export interface SupabaseErrorLike {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

export function handleSupabaseError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
  };
  console.error('Supabase Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Wrapper yang melempar error jika Supabase query gagal.
 * Gunakan: const data = await sb(supabase.from('x').select(), 'list', 'x')
 */
export async function sb<T>(
  queryPromise: PromiseLike<{ data: T | null; error: SupabaseErrorLike | null }>,
  operationType: OperationType,
  path: string
): Promise<T> {
  const { data, error } = await queryPromise;
  if (error) handleSupabaseError(error, operationType, path);
  return data as T;
}
