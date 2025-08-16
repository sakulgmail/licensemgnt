const express = require('express');
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private
router.get('/stats', authenticate, async (req, res) => {
  try {
    // Get total licenses
    const totalLicenses = await pool.query('SELECT COUNT(*) FROM licenses');
    
    // Get active licenses (not expired)
    const activeLicenses = await pool.query(
      'SELECT COUNT(*) FROM licenses WHERE expiration_date > CURRENT_DATE'
    );
    
    // Get expired licenses
    const expiredLicenses = await pool.query(
      'SELECT COUNT(*) FROM licenses WHERE expiration_date < CURRENT_DATE'
    );
    
    // Get licenses expiring soon (within 30 days)
    const expiringLicenses = await pool.query(
      `SELECT COUNT(*) 
       FROM licenses 
       WHERE expiration_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')`
    );
    
    // Get total customers
    const totalCustomers = await pool.query('SELECT COUNT(*) FROM customers');
    
    // Get total vendors
    const totalVendors = await pool.query('SELECT COUNT(*) FROM vendors');
    
    res.json({
      totalLicenses: parseInt(totalLicenses.rows[0].count, 10),
      expiringLicenses: parseInt(expiringLicenses.rows[0].count, 10),
      expiredLicenses: parseInt(expiredLicenses.rows[0].count, 10),
      totalCustomers: parseInt(totalCustomers.rows[0].count, 10),
      totalVendors: parseInt(totalVendors.rows[0].count, 10)
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/dashboard/expiring-soon
// @desc    Get licenses expiring soon
// @access  Private
router.get('/expiring-soon', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.*, c.name as customer_name, v.name as vendor_name
       FROM licenses l
       LEFT JOIN customers c ON l.customer_id = c.id
       LEFT JOIN vendors v ON l.vendor_id = v.id
       WHERE l.expiration_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
       ORDER BY l.expiration_date ASC`
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching expiring licenses:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/dashboard/expired
// @desc    Get all expired licenses
// @access  Private
router.get('/expired', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.*, c.name as customer_name, v.name as vendor_name
       FROM licenses l
       LEFT JOIN customers c ON l.customer_id = c.id
       LEFT JOIN vendors v ON l.vendor_id = v.id
       WHERE l.expiration_date < CURRENT_DATE
       AND l.is_active = true
       ORDER BY l.expiration_date ASC`
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching expired licenses:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
