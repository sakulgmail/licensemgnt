const { pool } = require('../config/db');

class License {
  // Get all licenses with optional filters and pagination
  static async getAll({
    search = '',
    vendorId,
    customerId,
    isActive,
    expiresSoon = false,
    limit = 10,
    offset = 0,
    sortBy = 'name',
    sortOrder = 'ASC'
  }) {
    const queryParams = [];
    let queryText = `
      SELECT 
        l.*,
        v.name as vendor_name,
        c.name as customer_name,
        u.username as created_by_username,
        COUNT(*) OVER() as total_count
      FROM licenses l
      LEFT JOIN vendors v ON l.vendor_id = v.id
      LEFT JOIN customers c ON l.customer_id = c.id
      LEFT JOIN users u ON l.created_by = u.id
      WHERE 1=1
    `;

    // Add search condition
    if (search) {
      queryParams.push(`%${search}%`);
      queryText += ` AND (l.name ILIKE $${queryParams.length} 
                        OR l.license_key::text ILIKE $${queryParams.length} 
                        OR l.description ILIKE $${queryParams.length})`;
    }

    // Add vendor filter
    if (vendorId) {
      queryParams.push(vendorId);
      queryText += ` AND l.vendor_id = $${queryParams.length}`;
    }

    // Add customer filter
    if (customerId) {
      queryParams.push(customerId);
      queryText += ` AND l.customer_id = $${queryParams.length}`;
    }

    // Add active status filter
    if (isActive !== undefined) {
      queryParams.push(isActive);
      queryText += ` AND l.is_active = $${queryParams.length}`;
    }

    // Add expiration filter
    if (expiresSoon) {
      queryParams.push('30 days');
      queryText += ` AND l.expiration_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + $${queryParams.length}::interval)`;
    }

    // Add sorting and pagination
    queryText += ` ORDER BY ${sortBy} ${sortOrder === 'DESC' ? 'DESC' : 'ASC'}
                  LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    
    queryParams.push(limit, offset);

    const result = await pool.query(queryText, queryParams);
    
    return {
      data: result.rows.map(row => {
        const { total_count, ...license } = row;
        return license;
      }),
      total: result.rows[0]?.total_count || 0
    };
  }

  // Get license by ID
  static async findById(id) {
    const result = await pool.query(
      `SELECT 
        l.*,
        v.name as vendor_name,
        c.name as customer_name,
        u.username as created_by_username
       FROM licenses l
       LEFT JOIN vendors v ON l.vendor_id = v.id
       LEFT JOIN customers c ON l.customer_id = c.id
       LEFT JOIN users u ON l.created_by = u.id
       WHERE l.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      const error = new Error('License not found');
      error.code = 'NOT_FOUND';
      throw error;
    }
    
    return result.rows[0];
  }

  // Create new license
  static async create({
    name,
    description,
    license_key,
    license_type,
    vendor_id,
    customer_id,
    purchase_date,
    expiration_date,
    cost,
    currency,
    is_active = true,
    notes,
    created_by
  }) {
    const result = await pool.query(
      `INSERT INTO licenses 
       (name, description, license_key, license_type, vendor_id, customer_id,
        purchase_date, expiration_date, cost, currency, is_active, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        name,
        description,
        license_key,
        license_type,
        vendor_id,
        customer_id,
        purchase_date,
        expiration_date,
        cost,
        currency,
        is_active,
        notes,
        created_by
      ]
    );

    return result.rows[0];
  }

  // Update license
  static async update(id, {
    name,
    description,
    license_key,
    license_type,
    vendor_id,
    customer_id,
    purchase_date,
    expiration_date,
    cost,
    currency,
    is_active,
    notes
  }) {
    const result = await pool.query(
      `UPDATE licenses 
       SET name = COALESCE($2, name),
           description = COALESCE($3, description),
           license_key = COALESCE($4, license_key),
           license_type = COALESCE($5, license_type),
           vendor_id = COALESCE($6, vendor_id),
           customer_id = COALESCE($7, customer_id),
           purchase_date = COALESCE($8, purchase_date),
           expiration_date = COALESCE($9, expiration_date),
           cost = COALESCE($10, cost),
           currency = COALESCE($11, currency),
           is_active = COALESCE($12, is_active),
           notes = COALESCE($13, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [
        id,
        name,
        description,
        license_key,
        license_type,
        vendor_id,
        customer_id,
        purchase_date,
        expiration_date,
        cost,
        currency,
        is_active,
        notes
      ]
    );

    if (result.rows.length === 0) {
      const error = new Error('License not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    return result.rows[0];
  }

  // Delete license
  static async delete(id) {
    const result = await pool.query(
      'DELETE FROM licenses WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      const error = new Error('License not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    return { id: result.rows[0].id };
  }

  // Get license statistics
  static async getStats() {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_licenses,
        SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active_licenses,
        SUM(CASE WHEN expiration_date < CURRENT_DATE AND is_active = true THEN 1 ELSE 0 END) as expired_licenses,
        SUM(CASE WHEN expiration_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days') AND is_active = true THEN 1 ELSE 0 END) as expiring_soon,
        SUM(cost) as total_cost
      FROM licenses
    `);

    return result.rows[0];
  }
}

module.exports = License;
