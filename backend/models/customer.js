const { pool } = require('../config/db');

class Customer {
  // Get all customers with optional search and pagination
  static async getAll({ search = '', limit = 10, offset = 0, sortBy = 'name', sortOrder = 'ASC' }) {
    const query = {
      text: `
        SELECT c.*, u.username as created_by_username,
               COUNT(*) OVER() as total_count
        FROM customers c
        LEFT JOIN users u ON c.created_by = u.id
        WHERE c.name ILIKE $1 OR c.contact_person ILIKE $1 OR c.email ILIKE $1
        ORDER BY ${sortBy} ${sortOrder === 'DESC' ? 'DESC' : 'ASC'}
        LIMIT $2 OFFSET $3
      `,
      values: [`%${search}%`, limit, offset]
    };

    const result = await pool.query(query);
    return {
      data: result.rows.map(row => {
        const { total_count, ...customer } = row;
        return customer;
      }),
      total: result.rows[0]?.total_count || 0
    };
  }

  // Get customer by ID
  static async findById(id) {
    const result = await pool.query(
      `SELECT c.*, u.username as created_by_username
       FROM customers c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      const error = new Error('Customer not found');
      error.code = 'NOT_FOUND';
      throw error;
    }
    
    return result.rows[0];
  }

  // Create new customer
  static async create({
    name,
    contact_person,
    email,
    phone,
    address,
    tax_id,
    notes,
    created_by
  }) {
    const result = await pool.query(
      `INSERT INTO customers 
       (name, contact_person, email, phone, address, tax_id, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, contact_person, email, phone, address, tax_id, notes, created_by]
    );

    return result.rows[0];
  }

  // Update customer
  static async update(id, {
    name,
    contact_person,
    email,
    phone,
    address,
    tax_id,
    notes
  }) {
    const result = await pool.query(
      `UPDATE customers 
       SET name = COALESCE($2, name),
           contact_person = COALESCE($3, contact_person),
           email = COALESCE($4, email),
           phone = COALESCE($5, phone),
           address = COALESCE($6, address),
           tax_id = COALESCE($7, tax_id),
           notes = COALESCE($8, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, name, contact_person, email, phone, address, tax_id, notes]
    );

    if (result.rows.length === 0) {
      const error = new Error('Customer not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    return result.rows[0];
  }

  // Delete customer
  static async delete(id) {
    // Check if customer has associated licenses
    const licenseCheck = await pool.query(
      'SELECT id FROM licenses WHERE customer_id = $1 LIMIT 1',
      [id]
    );

    if (licenseCheck.rows.length > 0) {
      const error = new Error('Cannot delete customer with associated licenses');
      error.code = 'CONSTRAINT_VIOLATION';
      throw error;
    }

    const result = await pool.query(
      'DELETE FROM customers WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      const error = new Error('Customer not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    return { id: result.rows[0].id };
  }
}

module.exports = Customer;
