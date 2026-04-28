// src/supabase.ts
// Pengganti firebase.ts — gunakan file ini di semua import
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL atau Key tidak ditemukan di .env');
}

// No-op lock: bypass navigator.locks API yang sering nyangkut setelah
// browser throttle background tab. Untuk aplikasi single-tab ini aman —
// Supabase server sendiri sudah handle race condition di sisi backend.
// Mencegah deadlock pada getSession/signOut/refreshSession.
const noOpLock = async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
  return await fn();
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    lock: noOpLock,
  },
  realtime: {
    heartbeatIntervalMs: 25000,
    reconnectAfterMs: (tries: number) => Math.min(tries * 1000, 10000),
  },
});

// Auth shortcut
export const auth = supabase.auth;

// Storage shortcut
export const storage = supabase.storage;
