const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth.middleware');

// Get capital transactions
router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM capital_transactions 
       ORDER BY created_at DESC 
       LIMIT 50`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching capital transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Update capital
router.post('/update', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { amount, type, reason } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    
    if (!type || !['credit', 'debit'].includes(type)) {
      return res.status(400).json({ error: 'Valid type (credit/debit) is required' });
    }
    
    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }
    
    await client.query('BEGIN');
    
    // Get current capital
    const capitalResult = await client.query(
      'SELECT current_amount FROM business_capital WHERE id = TRUE'
    );
    
    const currentAmount = parseFloat(capitalResult.rows[0].current_amount || 0);
    const newAmount = type === 'credit' 
      ? currentAmount + amount 
      : currentAmount - amount;
    
    // Insert transaction
    await client.query(
      `INSERT INTO capital_transactions (
        amount, type, source, reason, balance_after
      ) VALUES ($1, $2, 'manual_adjustment', $3, $4)`,
      [amount, type, reason, newAmount]
    );
    
    // Update capital
    await client.query(
      `UPDATE business_capital 
       SET current_amount = $1, updated_at = NOW()
       WHERE id = TRUE`,
      [newAmount]
    );
    
    await client.query('COMMIT');
    
    res.json({ 
      message: 'Capital updated successfully',
      new_balance: newAmount
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating capital:', error);
    res.status(500).json({ error: error.message || 'Failed to update capital' });
  } finally {
    client.release();
  }
});

module.exports = router;