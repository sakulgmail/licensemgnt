-- Add notification fields to licenses table
ALTER TABLE licenses
ADD COLUMN notification_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN notification_days INTEGER DEFAULT 7;
