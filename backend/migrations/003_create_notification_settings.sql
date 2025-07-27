-- Create notification settings table
CREATE TABLE IF NOT EXISTS user_notification_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    days_before_expiration INTEGER NOT NULL DEFAULT 7,
    email_notifications BOOLEAN NOT NULL DEFAULT true,
    in_app_notifications BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Add comments
COMMENT ON TABLE user_notification_settings IS 'Stores user notification preferences';
COMMENT ON COLUMN user_notification_settings.days_before_expiration IS 'Number of days before expiration to send notifications';
COMMENT ON COLUMN user_notification_settings.email_notifications IS 'Whether email notifications are enabled';
COMMENT ON COLUMN user_notification_settings.in_app_notifications IS 'Whether in-app notifications are enabled';
