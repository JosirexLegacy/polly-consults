const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth.middleware');

// Get Profit & Loss Summary
router.get('/profit-loss', authMiddleware, async (req, res) => {
  try {
    const { period } = req.query;
    let dateFilter = '';
    
    if (period === 'daily') {
      dateFilter = "AND transaction_date = CURRENT_DATE";
    } else if (period === 'weekly') {
      dateFilter = "AND transaction_date >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (period === 'monthly') {
      dateFilter = "AND transaction_date >= DATE_TRUNC('month', CURRENT_DATE)";
    } else if (period === 'yearly') {
      dateFilter = "AND transaction_date >= DATE_TRUNC('year', CURRENT_DATE)";
    }
    
    const result = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' AND category = 'interest' THEN amount END), 0) as interest_income,
        COALESCE(SUM(CASE WHEN type = 'income' AND category = 'fee' THEN amount END), 0) as fee_income,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN type = 'loan_repayment' THEN amount END), 0) as total_repayments,
        COALESCE(SUM(CASE WHEN type = 'loan_disbursement' THEN amount END), 0) as total_disbursements,
        COUNT(CASE WHEN type = 'income' THEN 1 END) as income_count,
        COUNT(CASE WHEN type = 'expense' THEN 1 END) as expense_count
      FROM financial_transactions
      WHERE 1=1 ${dateFilter}
    `);
    
    const data = result.rows[0];
    const grossProfit = data.total_income - data.total_expenses;
    const netProfit = grossProfit + data.interest_income;
    const profitMargin = data.total_income > 0 ? ((netProfit / data.total_income) * 100) : 0;
    
    res.json({
      ...data,
      gross_profit: grossProfit,
      net_profit: netProfit,
      profit_margin: parseFloat(profitMargin.toFixed(2))
    });
  } catch (error) {
    console.error('Error fetching profit/loss:', error);
    res.status(500).json({ error: 'Failed to fetch profit/loss data' });
  }
});

// Get monthly profit trends
router.get('/monthly-trends', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        DATE_TRUNC('month', transaction_date) as month,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) as expenses,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) - 
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) as profit
      FROM financial_transactions
      WHERE transaction_date >= DATE_TRUNC('year', CURRENT_DATE)
      GROUP BY DATE_TRUNC('month', transaction_date)
      ORDER BY month DESC
      LIMIT 12
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching monthly trends:', error);
    res.status(500).json({ error: 'Failed to fetch monthly trends' });
  }
});

// Get financial summary
router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        (SELECT COALESCE(SUM(amount), 0) FROM financial_transactions WHERE type = 'income' AND transaction_date >= DATE_TRUNC('month', CURRENT_DATE)) as month_income,
        (SELECT COALESCE(SUM(amount), 0) FROM financial_transactions WHERE type = 'expense' AND transaction_date >= DATE_TRUNC('month', CURRENT_DATE)) as month_expenses,
        (SELECT COALESCE(SUM(amount), 0) FROM financial_transactions WHERE type = 'income' AND transaction_date >= DATE_TRUNC('year', CURRENT_DATE)) as year_income,
        (SELECT COALESCE(SUM(amount), 0) FROM financial_transactions WHERE type = 'expense' AND transaction_date >= DATE_TRUNC('year', CURRENT_DATE)) as year_expenses,
        (SELECT COALESCE(SUM(amount), 0) FROM financial_transactions WHERE type = 'loan_repayment') as total_repayments,
        (SELECT COALESCE(SUM(amount), 0) FROM financial_transactions WHERE type = 'loan_disbursement') as total_disbursements
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching financial summary:', error);
    res.status(500).json({ error: 'Failed to fetch financial summary' });
  }
});

module.exports = router;