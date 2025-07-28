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
 * Send license expiration notifications in a single email
 * @param {Array} licenses - Array of license details with days until expiry
 * @param {string} recipient - Email address of the recipient
 * @param {string} [userEmail] - Optional user email to include in the notification
 */
async function sendLicenseExpirationEmail(licenses, recipient, userEmail) {
  try {
    logger.info('Preparing to send email with multiple licenses:', {
      recipient,
      licenseCount: licenses.length,
      userEmail,
      timestamp: new Date().toISOString()
    });
    
    if (!transporter) {
      throw new Error('Email transporter is not properly initialized');
    }
    
    if (!recipient) {
      throw new Error('No recipient email address provided');
    }

    // Sort licenses by days until expiry (ascending)
    const sortedLicenses = [...licenses].sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
    const expiringSoonest = sortedLicenses[0];
    
    // Calculate total number of licenses expiring
    const expiringCount = sortedLicenses.length;
    const hasMultiple = expiringCount > 1;
    
    // Create subject line with the soonest expiring license
    const { name, vendor_name } = expiringSoonest.license;
    const subject = hasMultiple 
      ? `[Action Required] ${expiringCount} licenses expiring soon (${expiringSoonest.daysUntilExpiry} days)`
      : `[Action Required] ${name} ${vendor_name ? `(${vendor_name}) ` : ''}expires in ${expiringSoonest.daysUntilExpiry} day${expiringSoonest.daysUntilExpiry !== 1 ? 's' : ''}`;
    
    // Create email content with table of expiring licenses
    let html = `
      <h2>License Expiration Notice</h2>
      <p>This is a notification that ${hasMultiple ? `you have ${expiringCount} licenses expiring soon` : 'a license is expiring soon'}:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-family: Arial, sans-serif;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">License</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Customer</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Vendor</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Expiration</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Days Left</th>
          </tr>
        </thead>
        <tbody>
          ${sortedLicenses.map(({ license, daysUntilExpiry }) => {
            const expiryDate = new Date(license.expiration_date).toLocaleDateString();
            const isExpired = daysUntilExpiry < 0;
            const rowStyle = isExpired 
              ? 'background-color: #ffebee; color: #c62828;' 
              : daysUntilExpiry <= 7 
                ? 'background-color: #fff8e1;' 
                : '';
                
            return `
              <tr style="${rowStyle}">
                <td style="padding: 10px; border-bottom: 1px solid #eee;">
                  <strong>${license.name}</strong><br>
                  <small style="color: #666;">${license.license_key || 'No key'}</small>
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${license.customer_name || 'N/A'}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${license.vendor_name || 'N/A'}</td>
                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">${expiryDate}</td>
                <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee; font-weight: bold; color: ${isExpired ? '#c62828' : daysUntilExpiry <= 7 ? '#e65100' : '#2e7d32'}">
                  ${isExpired ? `Expired ${-daysUntilExpiry} day${-daysUntilExpiry !== 1 ? 's' : ''} ago` : `${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`}
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
      
      <p>Please take appropriate action to renew or cancel these licenses.</p>
      <p>This is an automated message. Please do not reply to this email.</p>
      ${userEmail ? '<p>--<br>License Management System</p>' : ''}
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'License Management System <itmeesakul@gmail.com>',
      to: recipient,
      subject: subject,
      html: html,
      replyTo: process.env.EMAIL_REPLY_TO || 'noreply@itpattana.com',
      headers: {
        'X-Auto-Response-Suppress': 'OOF, AutoReply',
        'Precedence': 'bulk'
      }
    };

    // Send email
    await transporter.sendMail(mailOptions);
    
    // Mark all licenses as notified
    for (const { license } of licenses) {
      if (license.id) {
        try {
          await markLicenseAsNotified(license.id);
        } catch (error) {
          logger.error(`Error marking license ${license.id} as notified:`, error);
        }
      }
    }
    
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
    
    if (expiringLicenses.length === 0) {
      logger.info('No expiring licenses found');
      return { success: true, count: 0 };
    }
    
    // Group licenses by recipient
    const licensesByRecipient = new Map();
    
    // Process each license to group by recipient
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
        
        // Add to recipient's license list
        if (!licensesByRecipient.has(recipient)) {
          licensesByRecipient.set(recipient, {
            email: recipient,
            userEmail,
            licenses: []
          });
        }
        
        licensesByRecipient.get(recipient).licenses.push({
          license,
          daysUntilExpiry
        });
        
      } catch (error) {
        logger.error(`Error processing license ${license.id}:`, error);
      }
    }
    
    // Send one email per recipient with all their expiring licenses
    let notificationCount = 0;
    
    for (const [recipient, { email, userEmail, licenses }] of licensesByRecipient) {
      if (licenses.length === 0) continue;
      
      try {
        // Send notification email with all licenses for this recipient
        const emailSent = await sendLicenseExpirationEmail(
          licenses,  // Array of {license, daysUntilExpiry} objects
          email,     // Recipient email
          userEmail  // User email for reply-to
        );
        
        if (emailSent) {
          notificationCount += licenses.length;
          logger.info(`Notification sent for ${licenses.length} licenses to ${email}`);
        }
      } catch (error) {
        logger.error(`Error sending email to ${email}:`, error);
      }
    }
    
    logger.info(`Processed ${notificationCount} license notifications for ${licensesByRecipient.size} recipients`);
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
