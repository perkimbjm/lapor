-- Add columns to notifications table to store complaint details
-- This allows detailed notification display without JOIN to complaints table

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS complaint_id UUID REFERENCES complaints(id);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS ticket_number TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS lat NUMERIC;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS lng NUMERIC;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reporter_name TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS status TEXT;

-- Rename 'time' column to 'timestamp' for consistency if it exists
-- This handles the case where existing notifications use 'time'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'time'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'timestamp'
  ) THEN
    ALTER TABLE notifications RENAME COLUMN time TO timestamp;
  END IF;
END $$;
