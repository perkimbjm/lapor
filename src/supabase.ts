// src/supabase.ts
// Pengganti firebase.ts — gunakan file ini di semua import
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL atau Key tidak ditemukan di .env');
}

// Custom lock: navigator.locks default supabase bisa nyangkut setelah
// browser throttle background tab → semua auth call (getSession, signOut,
// refreshSession) hang selamanya. Lock ini timeout 5s lalu skip — aman
// untuk single-tab usage dan jauh lebih tahan banting.
const safeLock = async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
  return await Promise.race([
    fn(),
    new Promise<R>((_, reject) =>
      setTimeout(() => reject(new Error('Auth lock timeout')), 5000)
    ),
  ]).catch(async () => {
    // Lock timeout / lock error — eksekusi tanpa lock
    return await fn();
  });
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    lock: safeLock,
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
