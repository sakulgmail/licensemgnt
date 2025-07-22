const express = require('express');
const { check, validationResult } = require('express-validator');
const User = require('../models/user');
const logger = require('../utils/logger');
const { pool } = require('../server');
const router = express.Router();

// @route   POST api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
  '/register',
  [
    check('username', 'Username is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
    check('full_name', 'Full name is required').not().isEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, full_name } = req.body;

    try {
      // Check if user exists
      let user = await User.findByUsername(username);
      if (user) {
        return res.status(400).json({ errors: [{ msg: 'User already exists' }] });
      }

      // Create new user
      user = await User.create({
        username,
        email,
        password,
        full_name,
        role: 'user' // Default role
      });

      // Generate JWT token
      const token = User.generateToken(user);

      // Update last login
      await User.updateLastLogin(user.id);

      res.status(201).json({ token, user });
    } catch (err) {
      console.error('Error in user registration:', err);
      res.status(500).send('Server error');
    }
  }
);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  '/login',
  [
    check('username', 'Please include a valid username').exists(),
    check('password', 'Password is required').exists()
  ],
  async (req, res) => {
    logger.info('Login attempt', { username: req.body.username });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Login validation failed', { errors: errors.array() });
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
      logger.debug('Looking up user', { username });
      // Check if user exists
      const user = await User.findByUsername(username);
      if (!user) {
        logger.warn('User not found', { username });
        return res.status(400).json({ errors: [{ msg: 'Invalid credentials' }] });
      }
      logger.debug('User found', { userId: user.id, isActive: user.is_active });

      // Check if account is active
      if (!user.is_active) {
        logger.warn('Login attempt for inactive account', { username });
        return res.status(400).json({ errors: [{ msg: 'Account is deactivated' }] });
      }

      // Validate password
      logger.debug('Validating password');
      const isMatch = await User.validatePassword(user, password);
      if (!isMatch) {
        logger.warn('Invalid password', { username });
        return res.status(400).json({ errors: [{ msg: 'Invalid credentials' }] });
      }

      // Generate JWT token
      logger.debug('Generating token');
      const token = User.generateToken(user);

      // Update last login
      logger.debug('Updating last login', { userId: user.id });
      await User.updateLastLogin(user.id);

      // Return user data (excluding password)
      const { password_hash, ...userData } = user;
      logger.info('Login successful', { userId: user.id, username });
      res.json({ token, user: userData });
    } catch (err) {
      logger.error('Error in user login', { error: err.message, stack: err.stack });
      res.status(500).send('Server error');
    }
  }
);

// @route   GET api/auth/user
// @desc    Get current user data
// @access  Private
router.get('/user', require('../middleware/auth').authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
