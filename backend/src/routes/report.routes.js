const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth.middleware');

// Get dashboard stats
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const results = await Promise.all([
      pool.query('SELECT current_amount FROM business_capital WHERE id = TRUE'),
      pool.query('SELECT COUNT(*) FROM customers'),
      pool.query("SELECT COUNT(*) FROM loans WHERE status = 'active'"),
      pool.query("SELECT COUNT(*) FROM loans WHERE status = 'overdue'"),
      pool.query('SELECT COALESCE(SUM(amount), 0) FROM capital_transactions WHERE type = \'credit\' AND source = \'loan_repayment\' AND date >= DATE_TRUNC(\'month\', CURRENT_DATE)'),
      pool.query('SELECT COALESCE(SUM(amount), 0) FROM capital_transactions WHERE type = \'debit\' AND source = \'expense\' AND date >= DATE_TRUNC(\'month\', CURRENT_DATE)'),
    ]);
    
    res.json({
      totalCapital: parseInt(results[0].rows[0]?.current_amount || 0),
      totalCustomers: parseInt(results[1].rows[0].count),
      activeLoans: parseInt(results[2].rows[0].count),
      overdueLoans: parseInt(results[3].rows[0].count),
      monthlyIncome: parseInt(results[4].rows[0].sum || 0),
      monthlyExpenses: parseInt(results[5].rows[0].sum || 0),
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Get revenue report
router.get('/revenue', authMiddleware, async (req, res) => {
  try {
    const { period } = req.query;
    let dateFilter = '';
    
    if (period === 'month') {
      dateFilter = "AND date >= DATE_TRUNC('month', CURRENT_DATE)";
    } else if (period === 'year') {
      dateFilter = "AND date >= DATE_TRUNC('year', CURRENT_DATE)";
    }
    
    const result = await pool.query(`
      SELECT 
        DATE_TRUNC('month', date) as month,
        SUM(CASE WHEN type = 'credit' AND source = 'loan_repayment' THEN amount ELSE 0 END) as revenue,
        SUM(CASE WHEN type = 'debit' AND source = 'expense' THEN amount ELSE 0 END) as expenses
      FROM capital_transactions
      WHERE date >= DATE_TRUNC('year', CURRENT_DATE)
      GROUP BY DATE_TRUNC('month', date)
      ORDER BY month
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching revenue report:', error);
    res.status(500).json({ error: 'Failed to fetch revenue report' });
  }
});

module.exports = router;