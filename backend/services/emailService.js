const nodemailer = require('nodemailer');
const { pool } = require('../config/db');
require('dotenv').config();
const logger = require('../utils/logger');

/**
 * Get user email by user ID
 * @param {number} userId - The ID of the user
 * @returns {Promise<string|null>} The user's email or null if not found
 */
async function getUserEmail(userId) {
  try {
    const result = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    return result.rows[0]?.email || null;
  } catch (error) {
    logger.error('Error fetching user email:', error);
    return null;
  }
}

// Create transporter for sending emails
let transporter;
try {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    throw new Error('Gmail credentials are not properly configured in environment variables');
  }
  
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
    // Add more debugging
    debug: true,
    logger: true
  });
  
  // Verify connection configuration
  transporter.verify(function(error, success) {
    if (error) {
      logger.error('Error with mail transporter configuration:', error);
    } else {
      logger.info('Server is ready to take our messages');
    }
  });
} catch (error) {
  logger.error('Failed to create email transporter:', error);
  throw error;
}

/**
 * Send license expiration notification
 * @param {Object} license - License details
 * @param {string} recipient - Email address of the recipient
 * @param {number} daysUntilExpiry - Number of days until license expires
 * @param {string} [userEmail] - Optional user email to include in the notification
 */
async function sendLicenseExpirationEmail(license, recipient, daysUntilExpiry, userEmail) {
  try {
    logger.info('Preparing to send email:', {
      recipient,
      licenseName: license?.name,
      daysUntilExpiry,
      userEmail,
      timestamp: new Date().toISOString()
    });
    
    if (!transporter) {
      throw new Error('Email transporter is not properly initialized');
    }
    
    if (!recipient) {
      throw new Error('No recipient email address provided');
    }
    
    const { name, expiration_date, vendor_name, customer_name } = license;
    const expiryDate = new Date(expiration_date).toLocaleDateString();
    
    let subject = `[Action Required] ${name} ${vendor_name ? `(${vendor_name}) ` : ''}expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`;
    
    // Create email content
    let html = `
      <h2>License Expiration Notice</h2>
      <p>This is a notification that the following license is expiring soon:</p>
      
      <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #ff9800; background-color: #fff8e1;">
        <h3 style="margin-top: 0;">${name}</h3>
        <p><strong>Vendor:</strong> ${vendor_name || 'N/A'}</p>
        <p><strong>Customer:</strong> ${customer_name || 'N/A'}</p>
        <p><strong>Expiration Date:</strong> ${expiryDate}</p>
        <p><strong>Days Until Expiry:</strong> ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}</p>
      </div>
      <p>Please take appropriate action to renew or cancel this license.</p>
      <p>This is an automated message. Please do not reply to this email.</p>
      ${userEmail ? '<p>--<br>License Management System</p>' : ''}
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@itpattana.com',
      to: recipient,
      subject,
      html
    };

    logger.info('Sending email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });

    const info = await transporter.sendMail(mailOptions);
    logger.info('Email sent successfully:', {
      messageId: info.messageId,
      response: info.response,
      envelope: info.envelope
    });
    
    return true;
} catch (error) {
  logger.error('Error in sendLicenseExpirationEmail:', {
    error: error.message,
    stack: error.stack,
    licenseId: license?.id,
    recipient,
    daysUntilExpiry
  });
  
  // Re-throw the error with more context
  const enhancedError = new Error(`Failed to send email: ${error.message}`);
  enhancedError.originalError = error;
  enhancedError.licenseId = license?.id;
  enhancedError.recipient = recipient;
  throw enhancedError;
}
}

/**
 * Get all licenses that are about to expire
 * @param {number} daysAhead - Number of days to look ahead for expiring licenses
 * @param {boolean} includeInactive - Whether to include inactive licenses
 * @returns {Promise<Array>} - Array of expiring licenses
 */
async function getExpiringLicenses(daysAhead = 7, includeInactive = false) {
  try {
    const query = `
      SELECT l.*, v.name as vendor_name, c.name as customer_name
      FROM licenses l
      LEFT JOIN vendors v ON l.vendor_id = v.id
      LEFT JOIN customers c ON l.customer_id = c.id
      WHERE l.expiration_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + $1::integer * INTERVAL '1 day')
      AND l.is_active = true
      ORDER BY l.expiration_date ASC
    `;

    logger.debug('Checking for expiring contracts with query:', {
      query: query.replace(/\s+/g, ' ').trim(),
      daysAhead,
      includeInactive
    });

    const result = await pool.query(query, [daysAhead]);
    
    logger.debug(`Found ${result.rows.length} expiring contracts`, {
      count: result.rows.length,
      daysAhead,
      includeInactive
    });
    
    return result.rows;
  } catch (error) {
    console.error('Error fetching expiring contracts:', error);
    throw error;
  }
}

/**
 * Mark license as notified
 * @param {number} licenseId - ID of the license to mark as notified
 */
async function markLicenseAsNotified(licenseId) {
  try {
    await pool.query(
      'UPDATE licenses SET notification_sent = true, updated_at = NOW() WHERE id = $1',
      [licenseId]
    );
  } catch (error) {
    console.error('Error marking license as notified:', error);
    throw error;
  }
}

/**
 * Process license expirations and send notifications
 * @param {number} daysAhead - Number of days before expiration to send notification
 * @param {boolean} includeInactive - Whether to include inactive licenses
 * @param {number} [userId] - Optional user ID to filter licenses by owner
 * @returns {Promise<Object>} Result of the operation
 */
async function processLicenseExpirations(daysAhead, includeInactive = false, userId = null) {
  try {
    logger.info('Processing license expirations', { daysAhead, includeInactive, userId });
    
    // Get expiring licenses
    const expiringLicenses = await getExpiringLicenses(daysAhead, includeInactive);
    let notificationCount = 0;
    
    // Process each license
    for (const license of expiringLicenses) {
      try {
        // Default values
        let recipient = process.env.ADMIN_EMAIL;
        let userEmail = null;
        
        // Get notification settings for the user if userId is provided
        if (userId) {
          try {
            // Get the notification settings for this user
            const settingsResult = await pool.query(
              `SELECT uns.email_address, u.email 
               FROM user_notification_settings uns
               JOIN users u ON u.id = uns.user_id
               WHERE uns.user_id = $1`,
              [userId]
            );
            
            if (settingsResult.rows.length > 0) {
              const settings = settingsResult.rows[0];
              // Use the email from notification settings if available, otherwise use user's login email
              recipient = settings.email_address || settings.email;
              userEmail = recipient;
              logger.debug(`Using email for user ${userId}:`, { 
                recipient, 
                fromSettings: !!settings.email_address 
              });
            } else {
              logger.warn(`No notification settings found for user ${userId}`);
              // Fallback to user's login email if no settings found
              userEmail = await getUserEmail(userId);
              if (userEmail) {
                recipient = userEmail;
              }
            }
          } catch (error) {
            logger.error(`Error fetching notification settings for user ${userId}:`, error);
            // Fallback to user's login email if there's an error
            userEmail = await getUserEmail(userId);
            if (userEmail) {
              recipient = userEmail;
            }
          }
        }
        
        if (!recipient) {
          logger.warn(`No email recipient found for license ${license.id}`);
          continue;
        }
        
        // Calculate days until expiration
        const today = new Date();
        const expiryDate = new Date(license.expiration_date);
        const timeDiff = expiryDate.getTime() - today.getTime();
        const daysUntilExpiry = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        // Send notification email
        const emailSent = await sendLicenseExpirationEmail(
          license,  // Pass the license object as first parameter
          recipient,  // Recipient email
          daysUntilExpiry,  // Days until expiration
          userEmail  // User email for reply-to
        );
        
        if (emailSent) {
          notificationCount++;
          logger.info(`Notification sent for license ${license.id} to ${recipient}`);
        }
      } catch (error) {
        logger.error(`Error processing license ${license.id}:`, error);
      }
    }
    
    logger.info(`Processed ${notificationCount} license notifications`);
    return { success: true, count: notificationCount };
  } catch (error) {
    logger.error('Error processing license expirations:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendLicenseExpirationEmail,
  getExpiringLicenses,
  markLicenseAsNotified,
  processLicenseExpirations
};
