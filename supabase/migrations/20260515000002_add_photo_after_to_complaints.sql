-- Add photo_after column to complaints table for before/after comparison feature
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS photo_after text;
