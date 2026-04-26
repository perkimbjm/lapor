// src/supabase.ts
// Pengganti firebase.ts — gunakan file ini di semua import
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL atau Key tidak ditemukan di .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Auth shortcut
export const auth = supabase.auth;

// Storage shortcut
export const storage = supabase.storage;
