-- Add new columns to user_notification_settings table
ALTER TABLE user_notification_settings
ADD COLUMN IF NOT EXISTS notification_time TIME DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS email_address VARCHAR(255) DEFAULT 'admin@example.com',
ADD COLUMN IF NOT EXISTS include_inactive BOOLEAN DEFAULT false;

-- Rename columns to match the new schema
ALTER TABLE user_notification_settings 
RENAME COLUMN days_before_expiration TO days_before_expiration;

ALTER TABLE user_notification_settings 
RENAME COLUMN email_notifications TO send_to_email;

-- Add comments for the new columns
COMMENT ON COLUMN user_notification_settings.notification_time IS 'Time of day to send notifications';
COMMENT ON COLUMN user_notification_settings.email_address IS 'Email address to send notifications to';
COMMENT ON COLUMN user_notification_settings.include_inactive IS 'Whether to include inactive items in notifications';
