-- Add seats column to licenses table
ALTER TABLE licenses
ADD COLUMN IF NOT EXISTS seats INTEGER DEFAULT 1;
