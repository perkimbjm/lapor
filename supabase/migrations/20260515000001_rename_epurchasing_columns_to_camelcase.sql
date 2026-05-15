-- Fix column name mismatch: DB uses snake_case, JS uses camelCase.
-- Step 1: Drop the empty camelCase columns added by previous migration (they conflict).
-- Step 2: Rename the original snake_case columns to camelCase (preserving data & constraints).

-- ── Step 1: Drop conflicting empty camelCase columns ──────────────────────────
ALTER TABLE public.epurchasing DROP COLUMN IF EXISTS "noKontrak";
ALTER TABLE public.epurchasing DROP COLUMN IF EXISTS "namaPekerjaan";
ALTER TABLE public.epurchasing DROP COLUMN IF EXISTS "waktuPelaksanaan";
ALTER TABLE public.epurchasing DROP COLUMN IF EXISTS "tglKontrak";
ALTER TABLE public.epurchasing DROP COLUMN IF EXISTS "tglBerakhir";
ALTER TABLE public.epurchasing DROP COLUMN IF EXISTS "documentUrl";
ALTER TABLE public.epurchasing DROP COLUMN IF EXISTS "totalPrice";

-- ── Step 2: Rename snake_case → camelCase (safe, skips if column missing) ─────
DO $$ BEGIN ALTER TABLE public.epurchasing RENAME COLUMN no_kontrak        TO "noKontrak";        EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.epurchasing RENAME COLUMN nama_pekerjaan    TO "namaPekerjaan";    EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.epurchasing RENAME COLUMN waktu_pelaksanaan TO "waktuPelaksanaan"; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.epurchasing RENAME COLUMN tgl_kontrak       TO "tglKontrak";       EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.epurchasing RENAME COLUMN tgl_berakhir      TO "tglBerakhir";      EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.epurchasing RENAME COLUMN document_url      TO "documentUrl";      EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.epurchasing RENAME COLUMN total_price       TO "totalPrice";       EXCEPTION WHEN undefined_column THEN NULL; END $$;
