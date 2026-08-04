const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth.middleware');

// Get all loans (with optional customer_id filter)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { customer_id } = req.query;
    let query = `
      SELECT 
        l.*,
        c.name as customer_name,
        c.phone as customer_phone
      FROM loans l
      JOIN customers c ON l.customer_id = c.id
    `;
    const params = [];
    
    // Add filter if customer_id is provided
    if (customer_id) {
      query += ` WHERE l.customer_id = $1`;
      params.push(customer_id);
    }
    
    query += ` ORDER BY l.created_at DESC`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching loans:', error);
    res.status(500).json({ error: 'Failed to fetch loans' });
  }
});

// Get single loan
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        l.*,
        c.name as customer_name,
        c.phone as customer_phone,
        c.id as customer_id
      FROM loans l
      JOIN customers c ON l.customer_id = c.id
      WHERE l.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching loan:', error);
    res.status(500).json({ error: 'Failed to fetch loan' });
  }
});

// Create loan
router.post('/', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      customer_id,
      principal_amount,
      interest_rate,
      interest_type,
      total_payable,
      loan_date,
      due_date,
      repayment_frequency,
      notes
    } = req.body;
    
    // Validate required fields
    if (!customer_id || !principal_amount || !total_payable || !loan_date || !due_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    await client.query('BEGIN');
    
    const result = await client.query(
      `INSERT INTO loans (
        customer_id, principal_amount, interest_rate, interest_type,
        total_payable, amount_paid, remaining_balance,
        loan_date, due_date, repayment_frequency,
        notes, status
      ) VALUES ($1, $2, $3, $4, $5, 0, $5, $6, $7, $8, $9, 'active')
      RETURNING *`,
      [
        customer_id, principal_amount, interest_rate, interest_type,
        total_payable, loan_date, due_date, repayment_frequency,
        notes
      ]
    );
    
    // Update capital (disbursement)
    await client.query(
      `INSERT INTO capital_transactions (
        amount, type, source, reason, balance_after, loan_id
      )
      SELECT 
        $1, 'debit', 'loan_disbursement', 
        'Loan disbursement for customer',
        (SELECT current_amount - $1 FROM business_capital WHERE id = TRUE),
        $2
      FROM business_capital
      WHERE id = TRUE
      RETURNING *`,
      [principal_amount, result.rows[0].id]
    );
    
    await client.query(
      `UPDATE business_capital 
       SET current_amount = current_amount - $1, updated_at = NOW()
       WHERE id = TRUE`,
      [principal_amount]
    );
    
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating loan:', error);
    res.status(500).json({ error: error.message || 'Failed to create loan' });
  } finally {
    client.release();
  }
});

// Update loan
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      principal_amount,
      interest_rate,
      interest_type,
      total_payable,
      loan_date,
      due_date,
      repayment_frequency,
      notes
    } = req.body;
    
    const result = await pool.query(
      `UPDATE loans 
       SET principal_amount = $1, interest_rate = $2, interest_type = $3,
           total_payable = $4, loan_date = $5, due_date = $6,
           repayment_frequency = $7, notes = $8, updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        principal_amount, interest_rate, interest_type,
        total_payable, loan_date, due_date,
        repayment_frequency, notes, id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating loan:', error);
    res.status(500).json({ error: 'Failed to update loan' });
  }
});

// Delete loan
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if loan has payments
    const paymentCheck = await pool.query(
      'SELECT COUNT(*) FROM loan_payments WHERE loan_id = $1',
      [id]
    );
    
    if (parseInt(paymentCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete loan with payments. Archive instead.' 
      });
    }
    
    const result = await pool.query(
      'DELETE FROM loans WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    res.json({ message: 'Loan deleted successfully' });
  } catch (error) {
    console.error('Error deleting loan:', error);
    res.status(500).json({ error: 'Failed to delete loan' });
  }
});

// Update loan status
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['active', 'completed', 'overdue', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const result = await pool.query(
      `UPDATE loans 
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating loan status:', error);
    res.status(500).json({ error: 'Failed to update loan status' });
  }
});

module.exports = router;