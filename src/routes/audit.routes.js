const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth.middleware');

// Get audit logs with filters
router.get('/logs', authMiddleware, async (req, res) => {
  try {
    const { entity, action, admin_id, start_date, end_date, limit } = req.query;
    
    let query = `
      SELECT 
        al.*,
        a.username as admin_username,
        a.full_name as admin_name
      FROM audit_logs al
      LEFT JOIN admins a ON al.admin_id = a.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;
    
    if (entity) {
      query += ` AND al.entity = $${paramCount}`;
      params.push(entity);
      paramCount++;
    }
    
    if (action) {
      query += ` AND al.action = $${paramCount}`;
      params.push(action);
      paramCount++;
    }
    
    if (admin_id) {
      query += ` AND al.admin_id = $${paramCount}`;
      params.push(admin_id);
      paramCount++;
    }
    
    if (start_date) {
      query += ` AND al.created_at >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }
    
    if (end_date) {
      query += ` AND al.created_at <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }
    
    query += ` ORDER BY al.created_at DESC`;
    
    if (limit) {
      query += ` LIMIT $${paramCount}`;
      params.push(parseInt(limit));
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get audit summary
router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_logs,
        COUNT(DISTINCT admin_id) as unique_users,
        COUNT(CASE WHEN action = 'CREATE' THEN 1 END) as creates,
        COUNT(CASE WHEN action = 'UPDATE' THEN 1 END) as updates,
        COUNT(CASE WHEN action = 'DELETE' THEN 1 END) as deletes,
        COUNT(CASE WHEN action = 'LOGIN' THEN 1 END) as logins,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h
      FROM audit_logs
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching audit summary:', error);
    res.status(500).json({ error: 'Failed to fetch audit summary' });
  }
});

// Get audit report for printing
router.get('/report', authMiddleware, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_actions,
        COUNT(CASE WHEN action = 'CREATE' THEN 1 END) as creates,
        COUNT(CASE WHEN action = 'UPDATE' THEN 1 END) as updates,
        COUNT(CASE WHEN action = 'DELETE' THEN 1 END) as deletes,
        COUNT(CASE WHEN action = 'LOGIN' THEN 1 END) as logins,
        array_agg(DISTINCT entity) as entities_affected
      FROM audit_logs
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;
    
    if (start_date) {
      query += ` AND created_at >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }
    
    if (end_date) {
      query += ` AND created_at <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }
    
    query += ` GROUP BY DATE(created_at) ORDER BY date DESC`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error generating audit report:', error);
    res.status(500).json({ error: 'Failed to generate audit report' });
  }
});

// Get financial audit summary with accurate calculations
router.get('/financial-summary', authMiddleware, async (req, res) => {
  try {
    const { period } = req.query; // today, week, month, quarter, year
    
    let dateFilter = '';
    if (period === 'today') {
      dateFilter = "AND s.sale_date >= CURRENT_DATE";
    } else if (period === 'week') {
      dateFilter = "AND s.sale_date >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (period === 'month') {
      dateFilter = "AND s.sale_date >= DATE_TRUNC('month', CURRENT_DATE)";
    } else if (period === 'quarter') {
      dateFilter = "AND s.sale_date >= DATE_TRUNC('quarter', CURRENT_DATE)";
    } else if (period === 'year') {
      dateFilter = "AND s.sale_date >= DATE_TRUNC('year', CURRENT_DATE)";
    }

    // Get sales data
    const salesResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT s.id) as total_sales,
        COALESCE(SUM(s.total_amount), 0) as total_revenue,
        COALESCE(SUM(si.profit), 0) as total_profit,
        COUNT(DISTINCT s.customer_id) as unique_customers,
        COALESCE(SUM(si.quantity), 0) as total_items_sold
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      WHERE 1=1 ${dateFilter}
    `);

    // Get expenses
    const expensesResult = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total_expenses
      FROM expenses e
      WHERE 1=1 ${dateFilter.replace('s.sale_date', 'e.date')}
    `);

    // Get loans data
    const loansResult = await pool.query(`
      SELECT 
        COALESCE(SUM(principal_amount), 0) as total_disbursed,
        COALESCE(SUM(amount_paid), 0) as total_repaid
      FROM loans
      WHERE 1=1
    `);

    // Get inventory value
    const inventoryResult = await pool.query(`
      SELECT COALESCE(SUM(quantity * unit_price), 0) as inventory_value
      FROM products
    `);

    // Get capital balance
    const capitalResult = await pool.query(`
      SELECT current_amount as capital_balance
      FROM business_capital
      WHERE id = TRUE
    `);

    // Get top selling products
    const topProductsResult = await pool.query(`
      SELECT 
        p.name as product_name,
        COALESCE(SUM(si.quantity), 0) as quantity_sold,
        COALESCE(SUM(si.total_price), 0) as total_revenue,
        COALESCE(SUM(si.profit), 0) as total_profit
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      JOIN sales s ON si.sale_id = s.id
      WHERE 1=1 ${dateFilter}
      GROUP BY p.id, p.name
      ORDER BY quantity_sold DESC
      LIMIT 10
    `);

    // Get daily sales trend
    const dailyTrendResult = await pool.query(`
      SELECT 
        DATE(s.sale_date) as date,
        COUNT(DISTINCT s.id) as sales_count,
        COALESCE(SUM(s.total_amount), 0) as revenue,
        COALESCE(SUM(si.profit), 0) as profit,
        COALESCE(SUM(si.quantity), 0) as items_sold
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      WHERE 1=1 ${dateFilter}
      GROUP BY DATE(s.sale_date)
      ORDER BY date DESC
      LIMIT 30
    `);

    const salesData = salesResult.rows[0];
    const totalExpenses = parseFloat(expensesResult.rows[0]?.total_expenses || 0);
    const netProfit = (salesData.total_profit || 0) - totalExpenses;
    const netMargin = salesData.total_revenue > 0 
      ? ((salesData.total_profit - totalExpenses) / salesData.total_revenue) * 100 
      : 0;

    res.json({
      sales: {
        total_sales: parseInt(salesData.total_sales || 0),
        total_revenue: parseFloat(salesData.total_revenue || 0),
        total_profit: parseFloat(salesData.total_profit || 0),
        unique_customers: parseInt(salesData.unique_customers || 0),
        total_items_sold: parseInt(salesData.total_items_sold || 0),
      },
      expenses: totalExpenses,
      loans: {
        total_disbursed: parseFloat(loansResult.rows[0]?.total_disbursed || 0),
        total_repaid: parseFloat(loansResult.rows[0]?.total_repaid || 0),
      },
      inventory_value: parseFloat(inventoryResult.rows[0]?.inventory_value || 0),
      capital_balance: parseFloat(capitalResult.rows[0]?.capital_balance || 0),
      top_products: topProductsResult.rows.map(row => ({
        product_name: row.product_name,
        quantity_sold: parseInt(row.quantity_sold || 0),
        total_revenue: parseFloat(row.total_revenue || 0),
        total_profit: parseFloat(row.total_profit || 0),
      })),
      daily_trend: dailyTrendResult.rows.map(row => ({
        date: row.date,
        sales_count: parseInt(row.sales_count || 0),
        revenue: parseFloat(row.revenue || 0),
        profit: parseFloat(row.profit || 0),
        items_sold: parseInt(row.items_sold || 0),
      })),
      net_profit: netProfit,
      net_margin: parseFloat(netMargin.toFixed(2))
    });
  } catch (error) {
    console.error('Error fetching financial summary:', error);
    res.status(500).json({ error: 'Failed to fetch financial summary' });
  }
});

module.exports = router;