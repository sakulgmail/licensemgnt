const express = require('express');
const { check, query, validationResult } = require('express-validator');
const Customer = require('../models/customer');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Validation middleware
const validateCustomer = [
  check('name', 'Name is required').not().isEmpty(),
  check('contact_person', 'Contact person is required').not().isEmpty(),
  check('email', 'Please include a valid email').optional().isEmail(),
  check('phone', 'Phone number is required').optional().isMobilePhone(),
  check('address', 'Address is required').optional().isString(),
  check('tax_id', 'Tax ID must be a string').optional().isString(),
  check('notes', 'Notes must be a string').optional().isString()
];

// @route   GET api/customers
// @desc    Get all customers with search and pagination
// @access  Private
router.get(
  '/',
  authenticate,
  [
    query('search').optional().isString().trim(),
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
      console.log('Received query params:', req.query);
      let { search = '', limit = 10, page = 1, sortBy = 'name', sortOrder = 'ASC' } = req.query;
      
      // Convert limit to number and validate
      limit = parseInt(limit, 10);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        limit = 10; // Default to 10 if invalid
      }
      
      const offset = (page - 1) * limit;
      console.log('Final params:', { search, limit, page, offset, sortBy, sortOrder });

      const result = await Customer.getAll({
        search,
        limit,
        offset,
        sortBy,
        sortOrder
      });
      
      console.log('Customer.getAll result:', result);

      res.json({
        data: result.data || [],
        pagination: {
          total: result.total || 0,
          page: parseInt(page, 10) || 1,
          totalPages: Math.ceil((result.total || 0) / limit),
          limit: parseInt(limit, 10)
        }
      });
    } catch (err) {
      console.error('Error in GET /api/customers:', err);
      console.error('Error stack:', err.stack);
      res.status(500).json({ 
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }
);

// @route   GET api/customers/:id
// @desc    Get customer by ID
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    res.json(customer);
  } catch (err) {
    console.error('Error fetching customer:', err);
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ msg: 'Customer not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   POST api/customers
// @desc    Create a new customer
// @access  Private
router.post(
  '/',
  [authenticate, ...validateCustomer],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const customerData = {
        ...req.body,
        created_by: req.user.id
      };
      
      const customer = await Customer.create(customerData);
      res.status(201).json(customer);
    } catch (err) {
      console.error('Error creating customer:', err);
      if (err.code === '23505') { // Unique violation
        return res.status(400).json({ errors: [{ msg: 'Customer with this name or email already exists' }] });
      }
      res.status(500).send('Server error');
    }
  }
);

// @route   PUT api/customers/:id
// @desc    Update a customer
// @access  Private
router.put(
  '/:id',
  [authenticate, ...validateCustomer],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const customer = await Customer.update(req.params.id, req.body);
      res.json(customer);
    } catch (err) {
      console.error('Error updating customer:', err);
      if (err.code === 'NOT_FOUND') {
        return res.status(404).json({ msg: 'Customer not found' });
      }
      if (err.code === '23505') { // Unique violation
        return res.status(400).json({ errors: [{ msg: 'Customer with this name or email already exists' }] });
      }
      res.status(500).send('Server error');
    }
  }
);

// @route   DELETE api/customers/:id
// @desc    Delete a customer
// @access  Private
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await Customer.delete(req.params.id);
    res.json({ msg: 'Customer removed' });
  } catch (err) {
    console.error('Error deleting customer:', err);
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ msg: 'Customer not found' });
    }
    if (err.code === 'CONSTRAINT_VIOLATION') {
      return res.status(400).json({ msg: err.message });
    }
    res.status(500).send('Server error');
  }
});

module.exports = router;
