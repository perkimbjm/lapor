-- Fix epurchasing table: add missing columns and set up RLS policies
-- Handles both cases: table exists (add missing cols) or doesn't exist (create it)

-- ── Create table if it doesn't exist ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.epurchasing (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "noKontrak"        text,
  "namaPekerjaan"    text,
  nilai              numeric     DEFAULT 0,
  "waktuPelaksanaan" text,
  "tglKontrak"       text,
  "tglBerakhir"      text,
  status             text        DEFAULT 'Draft',
  "documentUrl"      text,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now(),
  -- legacy fields (nullable so new inserts without them still work)
  vendor             text,
  item               text,
  date               text,
  "totalPrice"       numeric
);

-- ── Add missing columns to existing table ─────────────────────────────────────
ALTER TABLE public.epurchasing ADD COLUMN IF NOT EXISTS "noKontrak"        text;
ALTER TABLE public.epurchasing ADD COLUMN IF NOT EXISTS "namaPekerjaan"    text;
ALTER TABLE public.epurchasing ADD COLUMN IF NOT EXISTS nilai              numeric DEFAULT 0;
ALTER TABLE public.epurchasing ADD COLUMN IF NOT EXISTS "waktuPelaksanaan" text;
ALTER TABLE public.epurchasing ADD COLUMN IF NOT EXISTS "tglKontrak"       text;
ALTER TABLE public.epurchasing ADD COLUMN IF NOT EXISTS "tglBerakhir"      text;
ALTER TABLE public.epurchasing ADD COLUMN IF NOT EXISTS status             text DEFAULT 'Draft';
ALTER TABLE public.epurchasing ADD COLUMN IF NOT EXISTS "documentUrl"      text;
ALTER TABLE public.epurchasing ADD COLUMN IF NOT EXISTS updated_at         timestamptz DEFAULT now();

-- ── Make legacy fields nullable (safe even if they didn't exist) ──────────────
DO $$ BEGIN ALTER TABLE public.epurchasing ALTER COLUMN vendor      DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.epurchasing ALTER COLUMN item        DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.epurchasing ALTER COLUMN date        DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.epurchasing ALTER COLUMN "totalPrice" DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;

-- ── Row Level Security ─────────────────────────────────────────────────────────
ALTER TABLE public.epurchasing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "epurchasing_select" ON public.epurchasing;
DROP POLICY IF EXISTS "epurchasing_insert" ON public.epurchasing;
DROP POLICY IF EXISTS "epurchasing_update" ON public.epurchasing;
DROP POLICY IF EXISTS "epurchasing_delete" ON public.epurchasing;

-- Authenticated users can perform all operations
CREATE POLICY "epurchasing_select" ON public.epurchasing
  FOR SELECT USING (true);

CREATE POLICY "epurchasing_insert" ON public.epurchasing
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "epurchasing_update" ON public.epurchasing
  FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "epurchasing_delete" ON public.epurchasing
  FOR DELETE TO authenticated
  USING (true);
