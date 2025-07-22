const express = require('express');
const { check, validationResult } = require('express-validator');
const User = require('../models/user');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

// @route   GET api/users
// @desc    Get all users (admin only)
// @access  Private/Admin
router.get('/', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const users = await User.getAll();
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).send('Server error');
  }
});

// @route   GET api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    // Only allow admin or the user themselves to access the profile
    if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ msg: 'Not authorized to access this resource' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    if (err.kind === 'not_found') {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   PUT api/users/:id
// @desc    Update user
// @access  Private
router.put(
  '/:id',
  [
    authenticate,
    [
      check('email', 'Please include a valid email').optional().isEmail(),
      check('full_name', 'Full name is required').optional().not().isEmpty(),
      check('role', 'Invalid role').optional().isIn(['user', 'admin']),
      check('is_active', 'is_active must be a boolean').optional().isBoolean()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Only allow admin or the user themselves to update the profile
    if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ msg: 'Not authorized to update this user' });
    }

    // Non-admin users cannot change their role or active status
    if (req.user.role !== 'admin') {
      if ('role' in req.body || 'is_active' in req.body) {
        return res.status(403).json({ msg: 'Not authorized to update this field' });
      }
    }

    try {
      const { email, full_name, role, is_active } = req.body;
      const updateData = {};
      
      if (email) updateData.email = email;
      if (full_name) updateData.full_name = full_name;
      if (role) updateData.role = role;
      if (is_active !== undefined) updateData.is_active = is_active;

      const user = await User.update(req.params.id, updateData);
      res.json(user);
    } catch (err) {
      console.error('Error updating user:', err);
      if (err.code === '23505') { // Unique violation
        return res.status(400).json({ errors: [{ msg: 'Email already in use' }] });
      }
      res.status(500).send('Server error');
    }
  }
);

// @route   DELETE api/users/:id
// @desc    Delete user
// @access  Private/Admin
router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    // Prevent self-deletion
    if (req.user.id === parseInt(req.params.id)) {
      return res.status(400).json({ msg: 'Cannot delete your own account' });
    }

    await User.delete(req.params.id);
    res.json({ msg: 'User deleted' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/users/:id/password
// @desc    Change password
// @access  Private
router.put(
  '/:id/password',
  [
    authenticate,
    [
      check('currentPassword', 'Current password is required').exists(),
      check('newPassword', 'Please enter a new password with 6 or more characters')
        .isLength({ min: 6 })
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Only allow users to change their own password
    if (req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ msg: 'Not authorized to change this password' });
    }

    const { currentPassword, newPassword } = req.body;

    try {
      const user = await User.findByUsername(req.user.username);
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }

      // Verify current password
      const isMatch = await User.validatePassword(user, currentPassword);
      if (!isMatch) {
        return res.status(400).json({ errors: [{ msg: 'Current password is incorrect' }] });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update password
      await pool.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [hashedPassword, req.user.id]
      );

      res.json({ msg: 'Password updated successfully' });
    } catch (err) {
      console.error('Error changing password:', err);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router;
