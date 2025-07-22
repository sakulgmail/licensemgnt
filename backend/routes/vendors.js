const express = require('express');
const { check, query, validationResult } = require('express-validator');
const Vendor = require('../models/vendor');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Validation middleware
const validateVendor = [
  check('name', 'Name is required').not().isEmpty(),
  check('contact_person', 'Contact person is required').not().isEmpty(),
  check('email', 'Please include a valid email').optional().isEmail(),
  check('phone', 'Phone number must be valid').optional().isMobilePhone(),
  check('website', 'Website must be a valid URL').optional().isURL(),
  check('address', 'Address must be a string').optional().isString(),
  check('notes', 'Notes must be a string').optional().isString()
];

// @route   GET api/vendors
// @desc    Get all vendors with search and pagination
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

      const { data, total } = await Vendor.getAll({
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
      console.error('Error fetching vendors:', err);
      res.status(500).send('Server error');
    }
  }
);

// @route   GET api/vendors/:id
// @desc    Get vendor by ID
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    res.json(vendor);
  } catch (err) {
    console.error('Error fetching vendor:', err);
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ msg: 'Vendor not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   POST api/vendors
// @desc    Create a new vendor
// @access  Private
router.post(
  '/',
  [authenticate, ...validateVendor],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const vendorData = {
        ...req.body,
        created_by: req.user.id
      };
      
      const vendor = await Vendor.create(vendorData);
      res.status(201).json(vendor);
    } catch (err) {
      console.error('Error creating vendor:', err);
      if (err.code === '23505') { // Unique violation
        return res.status(400).json({ errors: [{ msg: 'Vendor with this name or email already exists' }] });
      }
      res.status(500).send('Server error');
    }
  }
);

// @route   PUT api/vendors/:id
// @desc    Update a vendor
// @access  Private
router.put(
  '/:id',
  [authenticate, ...validateVendor],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const vendor = await Vendor.update(req.params.id, req.body);
      res.json(vendor);
    } catch (err) {
      console.error('Error updating vendor:', err);
      if (err.code === 'NOT_FOUND') {
        return res.status(404).json({ msg: 'Vendor not found' });
      }
      if (err.code === '23505') { // Unique violation
        return res.status(400).json({ errors: [{ msg: 'Vendor with this name or email already exists' }] });
      }
      res.status(500).send('Server error');
    }
  }
);

// @route   DELETE api/vendors/:id
// @desc    Delete a vendor
// @access  Private
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await Vendor.delete(req.params.id);
    res.json({ msg: 'Vendor removed' });
  } catch (err) {
    console.error('Error deleting vendor:', err);
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ msg: 'Vendor not found' });
    }
    if (err.code === 'CONSTRAINT_VIOLATION') {
      return res.status(400).json({ msg: err.message });
    }
    res.status(500).send('Server error');
  }
});

module.exports = router;
