-- Check the current structure of user_notification_settings
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns 
WHERE 
    table_name = 'user_notification_settings'
ORDER BY 
    ordinal_position;
