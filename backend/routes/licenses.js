const express = require('express');
const { check, query, validationResult } = require('express-validator');
const License = require('../models/license');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Validation middleware
const validateLicense = [
  check('name', 'Name is required').not().isEmpty(),
  check('license_key', 'License key is required').not().isEmpty(),
  check('vendor_id', 'Vendor is required').isInt({ min: 1 }),
  check('customer_id', 'Customer is required').isInt({ min: 1 }),
  check('purchase_date', 'Purchase date is required').isISO8601().toDate(),
  check('expiration_date', 'Expiration date is required').isISO8601().toDate(),
  check('cost', 'Cost must be a positive number').optional().isFloat({ min: 0 }),
  check('currency', 'Currency must be 3 characters').optional().isLength({ min: 3, max: 3 }),
  check('is_active', 'is_active must be a boolean').optional().isBoolean(),
  check('description', 'Description must be a string').optional().isString(),
  check('license_type', 'License type must be a string').optional().isString(),
  check('notes', 'Notes must be a string').optional().isString()
];

// @route   GET api/licenses
// @desc    Get all licenses with filters and pagination
// @access  Private
router.get(
  '/',
  authenticate,
  [
    query('search').optional().isString().trim(),
    query('customer_search').optional().isString().trim(),
    query('vendor_search').optional().isString().trim(),
    query('vendorId').optional().isInt({ min: 1 }).toInt(),
    query('customerId').optional().isInt({ min: 1 }).toInt(),
    query('isActive').optional().isBoolean().toBoolean(),
    query('expiresSoon').optional().isBoolean().toBoolean(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('sortBy').optional().isString().trim(),
    query('sortOrder').optional().isIn(['asc', 'desc', 'ASC', 'DESC'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { 
        search = '',
        customer_search = '',
        vendor_search = '',
        vendorId, 
        customerId, 
        isActive,
        expiresSoon = false,
        limit = 10, 
        page = 1, 
        sortBy = 'name', 
        sortOrder = 'ASC' 
      } = req.query;
      
      const offset = (page - 1) * limit;

      const { data, total } = await License.getAll({
        search,
        customerSearch: customer_search,
        vendorSearch: vendor_search,
        vendorId,
        customerId,
        isActive,
        expiresSoon,
        limit,
        offset,
        sortBy,
        sortOrder
      });

      res.json({
        data,
        pagination: {
          total,
          page: parseInt(page, 10),
          totalPages: Math.ceil(total / limit),
          limit: parseInt(limit, 10)
        }
      });
    } catch (err) {
      console.error('Error fetching licenses:', err);
      res.status(500).send('Server error');
    }
  }
);

// @route   GET api/licenses/stats
// @desc    Get license statistics
// @access  Private
router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await License.getStats();
    res.json(stats);
  } catch (err) {
    console.error('Error fetching license stats:', err);
    res.status(500).send('Server error');
  }
});

// @route   GET api/licenses/expiring-soon
// @desc    Get licenses expiring soon
// @access  Private
router.get('/expiring-soon', authenticate, async (req, res) => {
  try {
    const { data } = await License.getAll({
      expiresSoon: true,
      isActive: true,
      limit: 10,
      sortBy: 'expiration_date',
      sortOrder: 'ASC'
    });
    
    res.json(data);
  } catch (err) {
    console.error('Error fetching expiring licenses:', err);
    res.status(500).send('Server error');
  }
});

// @route   GET api/licenses/:id
// @desc    Get license by ID
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const license = await License.findById(req.params.id);
    res.json(license);
  } catch (err) {
    console.error('Error fetching license:', err);
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ msg: 'License not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   POST api/licenses
// @desc    Create a new license
// @access  Private
router.post(
  '/',
  [authenticate, ...validateLicense],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const licenseData = {
        ...req.body,
        created_by: req.user.id
      };
      
      const license = await License.create(licenseData);
      res.status(201).json(license);
    } catch (err) {
      console.error('Error creating license:', err);
      if (err.code === '23503') { // Foreign key violation
        return res.status(400).json({ errors: [{ msg: 'Invalid vendor or customer ID' }] });
      }
      if (err.code === '23505') { // Unique violation
        return res.status(400).json({ errors: [{ msg: 'License with this key already exists' }] });
      }
      res.status(500).send('Server error');
    }
  }
);

// @route   PUT api/licenses/:id
// @desc    Update a license
// @access  Private
router.put(
  '/:id',
  [authenticate, ...validateLicense],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const license = await License.update(req.params.id, req.body);
      res.json(license);
    } catch (err) {
      console.error('Error updating license:', err);
      if (err.code === 'NOT_FOUND') {
        return res.status(404).json({ msg: 'License not found' });
      }
      if (err.code === '23503') { // Foreign key violation
        return res.status(400).json({ errors: [{ msg: 'Invalid vendor or customer ID' }] });
      }
      if (err.code === '23505') { // Unique violation
        return res.status(400).json({ errors: [{ msg: 'License with this key already exists' }] });
      }
      res.status(500).send('Server error');
    }
  }
);

// @route   DELETE api/licenses/:id
// @desc    Delete a license
// @access  Private
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await License.delete(req.params.id);
    res.json({ msg: 'License removed' });
  } catch (err) {
    console.error('Error deleting license:', err);
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ msg: 'License not found' });
    }
    res.status(500).send('Server error');
  }
});

module.exports = router;
