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
      const { search = '', limit = 10, page = 1, sortBy = 'name', sortOrder = 'ASC' } = req.query;
      const offset = (page - 1) * limit;

      const { data, total } = await Customer.getAll({
        search,
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
      console.error('Error fetching customers:', err);
      res.status(500).send('Server error');
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
