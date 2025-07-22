const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger'); 
const { pool } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '24h';

class User {
  // Get user by ID
  static async findById(id) {
    const result = await pool.query(
      'SELECT id, username, email, full_name, role, is_active, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  // Get user by username
  static async findByUsername(username) {
    try {
      logger.debug('Executing query to find user by username', { username });
      const result = await pool.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
      );
      logger.debug('Query result', { 
        rowCount: result.rowCount,
        userFound: result.rows[0] ? true : false 
      });
      return result.rows[0];
    } catch (error) {
      logger.error('Error in findByUsername', { 
        error: error.message, 
        stack: error.stack,
        query: 'SELECT * FROM users WHERE username = $1',
        parameters: [username]
      });
      throw error;
    }
  }

  // Create new user
  static async create({ username, email, password, full_name, role = 'user' }) {
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id, username, email, full_name, role, created_at`,
      [username, email, hashedPassword, full_name, role]
    );

    return result.rows[0];
  }

  // Update user
  static async update(id, { email, full_name, role, is_active }) {
    const result = await pool.query(
      `UPDATE users 
       SET email = COALESCE($2, email),
           full_name = COALESCE($3, full_name),
           role = COALESCE($4, role),
           is_active = COALESCE($5, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, username, email, full_name, role, is_active, created_at`,
      [id, email, full_name, role, is_active]
    );

    return result.rows[0];
  }

  // Delete user
  static async delete(id) {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    return { id };
  }

  // Validate password
  static async validatePassword(user, password) {
    return await bcrypt.compare(password, user.password_hash);
  }

  // Generate JWT token
  static generateToken(user) {
    const payload = {
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRE });
  }

  // Get all users (for admin)
  static async getAll() {
    const result = await pool.query(
      'SELECT id, username, email, full_name, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    return result.rows;
  }

  // Update last login timestamp
  static async updateLastLogin(userId) {
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );
  }
}

module.exports = User;
