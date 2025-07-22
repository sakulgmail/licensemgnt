const nodemailer = require('nodemailer');
const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'license_mgnt',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Create transporter for sending emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

/**
 * Send contract expiration notification
 * @param {Object} contract - Contract details
 * @param {string} recipient - Email address of the recipient
 * @param {number} daysUntilExpiry - Number of days until contract expires
 */
async function sendContractExpirationEmail(contract, recipient, daysUntilExpiry) {
  const subject = `Contract Expiration Notice: ${contract.name}`;
  const expirationDate = new Date(contract.expiration_date).toLocaleDateString();
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@itpattana.com',
    to: recipient,
    subject,
    html: `
      <h2>Contract Expiration Notice</h2>
      <p>The following contract is ${daysUntilExpiry === 0 ? 'expiring today' : `expiring in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}`}:</p>
      <ul>
        <li><strong>Contract Name:</strong> ${contract.name}</li>
        <li><strong>Vendor:</strong> ${contract.vendor_name || 'N/A'}</li>
        <li><strong>Customer:</strong> ${contract.customer_name || 'N/A'}</li>
        <li><strong>Expiration Date:</strong> ${expirationDate}</li>
      </ul>
      <p>Please take appropriate action to renew or cancel this contract.</p>
      <p>This is an automated message. Please do not reply to this email.</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Notification email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending notification email:', error);
    return false;
  }
}

/**
 * Get all contracts that are about to expire
 * @param {number} daysAhead - Number of days to look ahead for expiring contracts
 * @returns {Promise<Array>} - Array of expiring contracts
 */
async function getExpiringContracts(daysAhead = 7) {
  try {
    const query = `
      SELECT 
        l.*,
        v.name as vendor_name,
        cust.name as customer_name,
        u.email as owner_email
      FROM licenses l
      LEFT JOIN vendors v ON l.vendor_id = v.id
      LEFT JOIN customers cust ON l.customer_id = cust.id
      LEFT JOIN users u ON l.created_by = u.id
      WHERE 
        l.expiration_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + $1::integer * INTERVAL '1 day')
        AND (l.notification_sent = false OR l.notification_sent IS NULL)
    `;

    const result = await pool.query(query, [daysAhead]);
    return result.rows;
  } catch (error) {
    console.error('Error fetching expiring contracts:', error);
    throw error;
  }
}

/**
 * Mark contract as notified
 * @param {number} contractId - ID of the contract to mark as notified
 */
async function markContractAsNotified(contractId) {
  try {
    await pool.query(
      'UPDATE licenses SET notification_sent = true, updated_at = NOW() WHERE id = $1',
      [contractId]
    );
  } catch (error) {
    console.error('Error marking contract as notified:', error);
    throw error;
  }
}

/**
 * Process and send notifications for expiring contracts
 * @param {number} daysAhead - Number of days to look ahead for expiring contracts
 */
async function processContractExpirations(daysAhead = 7) {
  try {
    console.log(`Checking for contracts expiring in the next ${daysAhead} days...`);
    const expiringContracts = await getExpiringContracts(daysAhead);
    
    console.log(`Found ${expiringContracts.length} contracts expiring soon`);
    
    for (const contract of expiringContracts) {
      const expirationDate = new Date(contract.expiration_date);
      const today = new Date();
      const diffTime = expirationDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (contract.owner_email) {
        console.log(`Sending notification for contract ${contract.name} to ${contract.owner_email}`);
        const emailSent = await sendContractExpirationEmail(
          contract,
          contract.owner_email,
          diffDays
        );
        
        if (emailSent) {
          await markContractAsNotified(contract.id);
        }
      }
    }
    
    console.log('Contract expiration notification process completed');
  } catch (error) {
    console.error('Error processing contract expirations:', error);
  }
}

module.exports = {
  sendContractExpirationEmail,
  getExpiringContracts,
  markContractAsNotified,
  processContractExpirations,
};
