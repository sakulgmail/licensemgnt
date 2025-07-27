-- Drop existing table if it exists
DROP TABLE IF EXISTS user_notification_settings CASCADE;

-- Recreate the table with the correct schema
CREATE TABLE user_notification_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  days_before_expiration INTEGER NOT NULL DEFAULT 7,
  send_to_email BOOLEAN NOT NULL DEFAULT true,
  notification_time TIME NOT NULL DEFAULT '09:00:00',
  email_address VARCHAR(255) NOT NULL DEFAULT 'admin@example.com',
  include_inactive BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_notification_settings_modtime
BEFORE UPDATE ON user_notification_settings
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Add comments for documentation
COMMENT ON TABLE user_notification_settings IS 'Stores user preferences for license expiration notifications';
COMMENT ON COLUMN user_notification_settings.days_before_expiration IS 'Number of days before license expiration to send notifications';
COMMENT ON COLUMN user_notification_settings.send_to_email IS 'Whether to send email notifications';
COMMENT ON COLUMN user_notification_settings.notification_time IS 'Time of day to send notifications';
COMMENT ON COLUMN user_notification_settings.email_address IS 'Email address to send notifications to';
COMMENT ON COLUMN user_notification_settings.include_inactive IS 'Whether to include inactive licenses in notifications';
