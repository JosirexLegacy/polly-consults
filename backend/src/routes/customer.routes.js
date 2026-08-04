const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth.middleware');

// Get all customers
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.*,
        COUNT(DISTINCT l.id) as total_loans,
        COUNT(DISTINCT CASE WHEN l.status = 'active' THEN l.id END) as active_loans,
        COALESCE(SUM(l.principal_amount), 0) as total_borrowed
      FROM customers c
      LEFT JOIN loans l ON c.id = l.customer_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Get single customer
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        c.*,
        COUNT(DISTINCT l.id) as total_loans,
        COUNT(DISTINCT CASE WHEN l.status = 'active' THEN l.id END) as active_loans,
        COALESCE(SUM(l.principal_amount), 0) as total_borrowed,
        COALESCE(SUM(l.amount_paid), 0) as total_paid
      FROM customers c
      LEFT JOIN loans l ON c.id = l.customer_id
      WHERE c.id = $1
      GROUP BY c.id
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// Create customer
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, phone, email, address, occupation, national_id, notes } = req.body;
    
    const result = await pool.query(
      `INSERT INTO customers (name, phone, email, address, occupation, national_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, phone, email, address, occupation, national_id, notes]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// Update customer
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, address, occupation, national_id, notes } = req.body;
    
    const result = await pool.query(
      `UPDATE customers 
       SET name = $1, phone = $2, email = $3, address = $4, 
           occupation = $5, national_id = $6, notes = $7, updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [name, phone, email, address, occupation, national_id, notes, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Delete customer
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if customer has loans
    const loanCheck = await pool.query(
      'SELECT COUNT(*) FROM loans WHERE customer_id = $1',
      [id]
    );
    
    if (parseInt(loanCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete customer with existing loans. Archive instead.' 
      });
    }
    
    const result = await pool.query(
      'DELETE FROM customers WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

module.exports = router;