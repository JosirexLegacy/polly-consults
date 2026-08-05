const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth.middleware');

// Get all payments (with optional loan_id filter)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { loan_id } = req.query;
    let query = `
      SELECT 
        lp.*,
        l.customer_id,
        c.name as customer_name,
        l.remaining_balance as loan_balance
      FROM loan_payments lp
      JOIN loans l ON lp.loan_id = l.id
      JOIN customers c ON l.customer_id = c.id
    `;
    const params = [];
    
    // Add filter if loan_id is provided
    if (loan_id) {
      query += ` WHERE lp.loan_id = $1`;
      params.push(loan_id);
    }
    
    query += ` ORDER BY lp.payment_date DESC`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Get single payment
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        lp.*,
        l.customer_id,
        c.name as customer_name,
        l.remaining_balance as loan_balance
      FROM loan_payments lp
      JOIN loans l ON lp.loan_id = l.id
      JOIN customers c ON l.customer_id = c.id
      WHERE lp.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

// Record payment
router.post('/', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      loan_id,
      amount_paid,
      payment_method,
      collector_notes
    } = req.body;
    
    // Validate inputs
    if (!loan_id || !amount_paid || amount_paid <= 0) {
      return res.status(400).json({ error: 'Valid loan_id and amount_paid are required' });
    }
    
    // Ensure amount is a number
    const amount = parseFloat(amount_paid);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }
    
    await client.query('BEGIN');
    
    // Get current loan balance
    const loanResult = await client.query(
      'SELECT remaining_balance FROM loans WHERE id = $1 FOR UPDATE',
      [loan_id]
    );
    
    if (loanResult.rows.length === 0) {
      throw new Error('Loan not found');
    }
    
    const currentBalance = parseFloat(loanResult.rows[0].remaining_balance);
    
    // Check if payment exceeds balance
    if (amount > currentBalance) {
      throw new Error(`Payment amount (${amount}) exceeds remaining balance (${currentBalance})`);
    }
    
    const newBalance = currentBalance - amount;
    
    // Record payment - using explicit type casting
    const paymentResult = await client.query(
      `INSERT INTO loan_payments (
        loan_id, payment_date, amount_paid, remaining_balance_after,
        payment_method, collector_notes
      ) VALUES ($1, NOW(), $2::BIGINT, $3::BIGINT, $4, $5)
      RETURNING *`,
      [loan_id, amount, newBalance, payment_method, collector_notes]
    );
    
    // Update loan - using explicit type casting
    await client.query(
      `UPDATE loans 
       SET amount_paid = amount_paid + $1::BIGINT, 
           remaining_balance = $2::BIGINT,
           updated_at = NOW(),
           status = CASE 
             WHEN $2::BIGINT = 0 THEN 'completed' 
             ELSE status 
           END
       WHERE id = $3`,
      [amount, newBalance, loan_id]
    );
    
    // Update capital - using explicit type casting
    await client.query(
      `INSERT INTO capital_transactions (
        amount, type, source, reason, balance_after, loan_id
      )
      SELECT 
        $1::BIGINT, 'credit', 'loan_repayment',
        'Loan repayment from customer',
        (SELECT current_amount + $1::BIGINT FROM business_capital WHERE id = TRUE),
        $2
      FROM business_capital
      WHERE id = TRUE
      RETURNING *`,
      [amount, loan_id]
    );
    
    await client.query(
      `UPDATE business_capital 
       SET current_amount = current_amount + $1::BIGINT, updated_at = NOW()
       WHERE id = TRUE`,
      [amount]
    );
    
    await client.query('COMMIT');
    res.status(201).json(paymentResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error recording payment:', error);
    res.status(500).json({ error: error.message || 'Failed to record payment' });
  } finally {
    client.release();
  }
});

// Delete payment (with reversal)
router.delete('/:id', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    
    await client.query('BEGIN');
    
    // Get payment details to reverse the transaction
    const paymentResult = await client.query(
      'SELECT loan_id, amount_paid FROM loan_payments WHERE id = $1',
      [id]
    );
    
    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    const { loan_id, amount_paid } = paymentResult.rows[0];
    const amount = parseFloat(amount_paid);
    
    // Get current loan balance before reversal
    const loanResult = await client.query(
      'SELECT remaining_balance, amount_paid as total_paid FROM loans WHERE id = $1 FOR UPDATE',
      [loan_id]
    );
    
    if (loanResult.rows.length === 0) {
      throw new Error('Loan not found');
    }
    
    const currentBalance = parseFloat(loanResult.rows[0].remaining_balance);
    const currentPaid = parseFloat(loanResult.rows[0].total_paid);
    const newBalance = currentBalance + amount;
    const newPaid = currentPaid - amount;
    
    // Update loan - reverse the payment with explicit type casting
    await client.query(
      `UPDATE loans 
       SET amount_paid = $1::BIGINT, 
           remaining_balance = $2::BIGINT,
           updated_at = NOW(),
           status = CASE 
             WHEN $2::BIGINT > 0 AND status = 'completed' THEN 'active'
             ELSE status 
           END
       WHERE id = $3`,
      [newPaid, newBalance, loan_id]
    );
    
    // Delete the payment record
    await client.query(
      'DELETE FROM loan_payments WHERE id = $1',
      [id]
    );
    
    // Reverse capital transaction (remove the credit)
    await client.query(
      `UPDATE business_capital 
       SET current_amount = current_amount - $1::BIGINT, updated_at = NOW()
       WHERE id = TRUE`,
      [amount]
    );
    
    await client.query('COMMIT');
    res.json({ 
      message: 'Payment deleted and reversed successfully',
      new_balance: newBalance
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting payment:', error);
    res.status(500).json({ error: error.message || 'Failed to delete payment' });
  } finally {
    client.release();
  }
});

module.exports = router;