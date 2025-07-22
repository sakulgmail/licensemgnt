const { pool } = require('../config/db');

class Vendor {
  // Get all vendors with optional search and pagination
  static async getAll({ search = '', limit = 10, offset = 0, sortBy = 'name', sortOrder = 'ASC' }) {
    const query = {
      text: `
        SELECT v.*, u.username as created_by_username,
               COUNT(*) OVER() as total_count
        FROM vendors v
        LEFT JOIN users u ON v.created_by = u.id
        WHERE v.name ILIKE $1 OR v.contact_person ILIKE $1 OR v.email ILIKE $1
        ORDER BY ${sortBy} ${sortOrder === 'DESC' ? 'DESC' : 'ASC'}
        LIMIT $2 OFFSET $3
      `,
      values: [`%${search}%`, limit, offset]
    };

    const result = await pool.query(query);
    return {
      data: result.rows.map(row => {
        const { total_count, ...vendor } = row;
        return vendor;
      }),
      total: result.rows[0]?.total_count || 0
    };
  }

  // Get vendor by ID
  static async findById(id) {
    const result = await pool.query(
      `SELECT v.*, u.username as created_by_username
       FROM vendors v
       LEFT JOIN users u ON v.created_by = u.id
       WHERE v.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      const error = new Error('Vendor not found');
      error.code = 'NOT_FOUND';
      throw error;
    }
    
    return result.rows[0];
  }

  // Create new vendor
  static async create({
    name,
    contact_person,
    email,
    phone,
    website,
    address,
    notes,
    created_by
  }) {
    const result = await pool.query(
      `INSERT INTO vendors 
       (name, contact_person, email, phone, website, address, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, contact_person, email, phone, website, address, notes, created_by]
    );

    return result.rows[0];
  }

  // Update vendor
  static async update(id, {
    name,
    contact_person,
    email,
    phone,
    website,
    address,
    notes
  }) {
    const result = await pool.query(
      `UPDATE vendors 
       SET name = COALESCE($2, name),
           contact_person = COALESCE($3, contact_person),
           email = COALESCE($4, email),
           phone = COALESCE($5, phone),
           website = COALESCE($6, website),
           address = COALESCE($7, address),
           notes = COALESCE($8, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, name, contact_person, email, phone, website, address, notes]
    );

    if (result.rows.length === 0) {
      const error = new Error('Vendor not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    return result.rows[0];
  }

  // Delete vendor
  static async delete(id) {
    // Check if vendor has associated licenses
    const licenseCheck = await pool.query(
      'SELECT id FROM licenses WHERE vendor_id = $1 LIMIT 1',
      [id]
    );

    if (licenseCheck.rows.length > 0) {
      const error = new Error('Cannot delete vendor with associated licenses');
      error.code = 'CONSTRAINT_VIOLATION';
      throw error;
    }

    const result = await pool.query(
      'DELETE FROM vendors WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      const error = new Error('Vendor not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    return { id: result.rows[0].id };
  }
}

module.exports = Vendor;
