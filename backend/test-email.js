const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('Using Gmail account:', process.env.GMAIL_USER);

// Create a test transporter with debug logging
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false // Only for testing with self-signed certificates
  },
  logger: true, // Enable logging
  debug: true   // Include SMTP traffic in the logs
});

// Verify connection configuration
transporter.verify(function(error, success) {
  if (error) {
    console.error('Server verification failed:', error);
  } else {
    console.log('Server is ready to take our messages');
  }
});

// Test email options
const testEmails = [
  'sakul.tunboonek@itpattana.com',  // Your work email
  'itmeesakul@gmail.com'            // Your Gmail for testing
];

async function sendTestEmail(recipient) {
  console.log(`\n=== Testing email to: ${recipient} ===`);
  
  const mailOptions = {
    from: `"License Management System" <${process.env.GMAIL_USER}>`,
    to: recipient,
    subject: `Test Email to ${recipient}`,
    text: `This is a test email from the License Management System to ${recipient}.`,
    html: `
      <h2>Test Email to ${recipient}</h2>
      <p>This is a <strong>test email</strong> from the License Management System.</p>
      <p>If you're receiving this email, the SMTP configuration is working correctly!</p>
      <p>Sent at: ${new Date().toLocaleString()}</p>
      <p>From: ${process.env.GMAIL_USER}</p>
      <p>To: ${recipient}</p>
    `
  };

  try {
    console.log('Sending test email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Preview URL:', nodemailer.getTestMessageUrl(info));
    console.log('   Response:', info.response);
  } catch (error) {
    console.error('❌ Error sending email:', error);
    if (error.responseCode) {
      console.error('   Response Code:', error.responseCode);
      console.error('   Response:', error.response);
    }
  }
}

// Run tests
(async () => {
  // Verify SMTP connection first
  try {
    console.log('Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ Server is ready to take our messages');
    
    // Send test emails
    for (const email of testEmails) {
      await sendTestEmail(email);
      // Add a small delay between emails
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } catch (error) {
    console.error('❌ SMTP Verification failed:', error);
  }
})();
