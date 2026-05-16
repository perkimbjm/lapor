-- Add warehouse stock tracking columns to materials table
-- stock_contracted : quantity specified in procurement contract (Material Saat Kontrak)
-- stock_in         : cumulative stock received into warehouse (Stok Datang)
-- stock_out        : cumulative stock dispatched/used (Stok Keluar)
-- current_stock is kept as the derived value (stock_in - stock_out), updated on every save

ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS stock_contracted integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_in         integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_out        integer NOT NULL DEFAULT 0;
