const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const { sendLicenseExpirationEmail } = require('../services/emailService');
const { updateUserSchedule } = require('../services/scheduler');

// Get notification settings
router.get('/notifications', authenticate, async (req, res) => {
  try {
    const userId = req.user.id; // Changed from req.user.userId to req.user.id
    const result = await pool.query(
      'SELECT * FROM user_notification_settings WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // Return default settings if no settings exist
      return res.json({
        daysBeforeExpiration: 30,
        notificationTime: '09:00',
        sendToEmail: true,
        emailAddress: 'admin@example.com',
        includeInactive: false
      });
    }

    // Map database fields to frontend expected format
    const settings = result.rows[0];
    res.json({
      daysBeforeExpiration: settings.days_before_expiration || 30,
      notificationTime: settings.notification_time || '09:00',
      sendToEmail: settings.email_notifications !== false, // Default to true if not set
      emailAddress: settings.email_address || 'admin@example.com',
      includeInactive: settings.include_inactive || false
    });
  } catch (error) {
    logger.error('Error fetching notification settings:', error);
    res.status(500).json({ error: 'Failed to fetch notification settings' });
  }
});

// Update notification settings
router.put('/notifications', authenticate, async (req, res) => {
  try {
    console.log('Received notification settings update request:', req.body);
    const userId = req.user.id;
    const { 
      daysBeforeExpiration, 
      notificationTime = '09:00', 
      sendToEmail = true, 
      emailAddress = 'admin@example.com', 
      includeInactive = false 
    } = req.body;

    // Validate input
    if (!daysBeforeExpiration || daysBeforeExpiration < 1 || daysBeforeExpiration > 365) {
      console.error('Invalid daysBeforeExpiration:', daysBeforeExpiration);
      return res.status(400).json({ error: 'Days before expiration must be between 1 and 365' });
    }

    // Validate email if sendToEmail is true
    if (sendToEmail && !/^\S+@\S+\.\S+$/.test(emailAddress)) {
      console.error('Invalid email address:', emailAddress);
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    // Check if settings already exist
    console.log('Checking for existing settings for user:', userId);
    const existingSettings = await pool.query(
      'SELECT * FROM user_notification_settings WHERE user_id = $1',
      [userId]
    );

    console.log('Existing settings:', existingSettings.rows);

    try {
      if (existingSettings.rows.length > 0) {
        // Update existing settings
        console.log('Updating existing settings for user:', userId);
        console.log('Updating with values:', {
          daysBeforeExpiration,
          sendToEmail,
          notificationTime,
          emailAddress,
          includeInactive,
          userId
        });
        
        // Update the settings in the database
        const result = await pool.query(
          `UPDATE user_notification_settings 
           SET days_before_expiration = $1, 
               send_to_email = $2, 
               notification_time = $3,
               email_address = $4,
               include_inactive = $5,
               updated_at = NOW()
           WHERE user_id = $6
           RETURNING *`,
          [
            daysBeforeExpiration, 
            sendToEmail, 
            notificationTime, 
            emailAddress, 
            includeInactive,
            userId
          ]
        );
        console.log('Update result:', result.rows[0]);
        
        // Update the scheduler with the new settings
        await updateUserSchedule(userId);
      } else {
        // Insert new settings
        console.log('Inserting new settings for user:', userId);
        console.log('Inserting with values:', {
          userId,
          daysBeforeExpiration,
          sendToEmail,
          notificationTime,
          emailAddress,
          includeInactive
        });
        
        const result = await pool.query(
          `INSERT INTO user_notification_settings 
           (user_id, days_before_expiration, send_to_email, notification_time, email_address, include_inactive)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            userId, 
            daysBeforeExpiration, 
            sendToEmail, 
            notificationTime, 
            emailAddress, 
            includeInactive
          ]
        );
        console.log('Insert result:', result.rows[0]);
        
        // Update the scheduler with the new settings for new users
        await updateUserSchedule(userId);
      }

      res.json({ message: 'Notification settings updated successfully' });
    } catch (dbError) {
      console.error('Database error details:', {
        error: dbError,
        message: dbError.message,
        stack: dbError.stack,
        query: dbError.query,
        parameters: dbError.parameters
      });
      logger.error('Database error updating notification settings:', dbError);
      res.status(500).json({ 
        error: 'Failed to update notification settings',
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }
  } catch (error) {
    console.error('Error in PUT /notifications endpoint:', {
      error: error,
      message: error.message,
      stack: error.stack
    });
    logger.error('Error in notification settings endpoint:', error);
    res.status(500).json({ 
      error: 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Test email endpoint
router.get('/test-email', authenticate, async (req, res) => {
  const logger = require('../utils/logger');
  
  try {
    logger.info('Test email endpoint called', { userId: req.user.id });
    const userId = req.user.id;
    
    // Get user's email and settings
    const userResult = await pool.query(
      `SELECT u.email, uns.* 
       FROM users u 
       LEFT JOIN user_notification_settings uns ON u.id = uns.user_id 
       WHERE u.id = $1`,
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      logger.error('User not found in database', { userId });
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    const user = userResult.rows[0];
    // Use the notification email from settings if available, otherwise fall back to user's login email
    const recipient = user.email_address || user.email;
    
    if (!recipient) {
      logger.error('No email address found for user', { userId, hasEmail: !!user.email });
      return res.status(400).json({ 
        success: false,
        error: 'No email address found for your user account. Please update your profile with a valid email address.' 
      });
    }
    
    logger.info('Sending test email to user:', { 
      recipient, 
      userId: user.id,
      userEmail: user.email,
      userData: JSON.stringify(user, null, 2)
    });
    
    // Create a test contract
    const testContract = {
      id: 'test-123',
      name: 'Test License',
      vendor_name: 'Test Vendor',
      customer_name: 'Test Customer',
      expiration_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: 'Active'
    };
    
    try {
      // Send test email
      await sendLicenseExpirationEmail(
        recipient,
        testContract.name,
        testContract.vendor_name,
        testContract.customer_name,
        testContract.expiration_date,
        7 // days until expiration
      );
      
      logger.info('Test email sent successfully', { recipient });
      return res.json({ 
        success: true, 
        message: `Test email sent to ${recipient}` 
      });
      
    } catch (emailError) {
      logger.error('Error in sendLicenseExpirationEmail:', {
        error: emailError.message,
        stack: emailError.stack,
        recipient,
        userId
      });
      
      // Check for common SMTP errors
      let errorMessage = 'Failed to send test email';
      if (emailError.message.includes('Invalid login')) {
        errorMessage = 'Invalid email credentials. Please check your Gmail settings.';
      } else if (emailError.message.includes('Connection timeout')) {
        errorMessage = 'Connection to email server timed out. Please check your internet connection.';
      }
      
      return res.status(500).json({ 
        success: false, 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? emailError.message : undefined
      });
    }
    
  } catch (error) {
    logger.error('Unexpected error in test email endpoint:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
