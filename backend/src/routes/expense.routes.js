const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth.middleware');

// Get all expenses
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { category, start_date, end_date } = req.query;
    let query = `
      SELECT e.*, ec.name as category_name
      FROM expenses e
      JOIN expense_categories ec ON e.category_id = ec.id
      WHERE 1=1
    `;
    const params = [];
    
    if (category && category !== 'all') {
      query += ` AND ec.name = $${params.length + 1}`;
      params.push(category);
    }
    if (start_date) {
      query += ` AND e.date >= $${params.length + 1}`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND e.date <= $${params.length + 1}`;
      params.push(end_date);
    }
    
    query += ' ORDER BY e.date DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// Create expense
router.post('/', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { category_id, amount, description, date } = req.body;
    
    await client.query('BEGIN');
    
    // Insert expense
    const result = await client.query(
      `INSERT INTO expenses (date, category_id, amount, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [date, category_id, amount, description]
    );
    
    // Update capital
    await client.query(
      `INSERT INTO capital_transactions (
        amount, type, source, reason, balance_after, expense_id
      )
      SELECT 
        $1, 'debit', 'expense',
        $2,
        (SELECT current_amount - $1 FROM business_capital WHERE id = TRUE),
        $3
      FROM business_capital
      WHERE id = TRUE
      RETURNING *`,
      [amount, description, result.rows[0].id]
    );
    
    await client.query(
      `UPDATE business_capital 
       SET current_amount = current_amount - $1, updated_at = NOW()
       WHERE id = TRUE`,
      [amount]
    );
    
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating expense:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  } finally {
    client.release();
  }
});

// Update expense
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, amount, description, date } = req.body;
    
    const result = await pool.query(
      `UPDATE expenses 
       SET date = $1, category_id = $2, amount = $3, description = $4
       WHERE id = $5
       RETURNING *`,
      [date, category_id, amount, description, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// Delete expense
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM expenses WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// Get expense categories
router.get('/categories', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM expense_categories ORDER BY name'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

module.exports = router;