const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();

console.log('🚀 Polly Consults API Starting...');

// ==================== DATABASE ====================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ==================== CORS ====================
app.use(cors({
  origin: ['https://polly-consults-frontend.vercel.app', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// ==================== AUTH MIDDLEWARE ====================
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ==================== PUBLIC ROUTES ====================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Polly Consults API' });
});

// ==================== LOGIN ====================
app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('🔍 Login attempt:', username);

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Query database
    const result = await pool.query(
      'SELECT * FROM admins WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = result.rows[0];
    
    // Compare password (using bcrypt)
    const bcrypt = require('bcrypt');
    const valid = await bcrypt.compare(password, admin.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        full_name: admin.full_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== PROTECTED ROUTES ====================

// ---------- CUSTOMERS ----------
app.get('/customers', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Customers error:', error);
    res.json([]);
  }
});

app.post('/customers', auth, async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;
    const result = await pool.query(
      'INSERT INTO customers (name, phone, email, address) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, phone, email, address]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// ---------- LOANS ----------
app.get('/loans', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.*, c.name as customer_name 
      FROM loans l 
      LEFT JOIN customers c ON l.customer_id = c.id 
      ORDER BY l.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Loans error:', error);
    res.json([]);
  }
});

app.post('/loans', auth, async (req, res) => {
  try {
    const { customer_id, principal_amount, interest_rate, total_payable, loan_date, due_date } = req.body;
    const result = await pool.query(
      `INSERT INTO loans (customer_id, principal_amount, interest_rate, total_payable, remaining_balance, loan_date, due_date)
       VALUES ($1, $2, $3, $4, $4, $5, $6) RETURNING *`,
      [customer_id, principal_amount, interest_rate, total_payable, loan_date, due_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create loan error:', error);
    res.status(500).json({ error: 'Failed to create loan' });
  }
});

// ---------- PAYMENTS ----------
app.get('/payments', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, l.customer_id, c.name as customer_name 
      FROM loan_payments p 
      JOIN loans l ON p.loan_id = l.id 
      LEFT JOIN customers c ON l.customer_id = c.id 
      ORDER BY p.payment_date DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Payments error:', error);
    res.json([]);
  }
});

app.post('/payments', auth, async (req, res) => {
  try {
    const { loan_id, amount_paid, payment_method } = req.body;
    
    // Get current balance
    const loanResult = await pool.query('SELECT remaining_balance FROM loans WHERE id = $1', [loan_id]);
    if (loanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    
    const currentBalance = loanResult.rows[0].remaining_balance;
    const newBalance = currentBalance - amount_paid;
    
    // Insert payment
    const result = await pool.query(
      `INSERT INTO loan_payments (loan_id, amount_paid, remaining_balance_after, payment_method)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [loan_id, amount_paid, newBalance, payment_method]
    );
    
    // Update loan balance
    await pool.query(
      `UPDATE loans SET remaining_balance = $1, amount_paid = amount_paid + $2, 
       status = CASE WHEN $1 = 0 THEN 'completed' ELSE status END 
       WHERE id = $3`,
      [newBalance, amount_paid, loan_id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// ---------- EXPENSES ----------
app.get('/expenses', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM expenses ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Expenses error:', error);
    res.json([]);
  }
});

app.post('/expenses', auth, async (req, res) => {
  try {
    const { description, amount, category, date } = req.body;
    const result = await pool.query(
      'INSERT INTO expenses (description, amount, category, date) VALUES ($1, $2, $3, $4) RETURNING *',
      [description, amount, category, date]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// ---------- INVENTORY ----------
app.get('/inventory/products', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Inventory error:', error);
    res.json([]);
  }
});

app.get('/inventory/categories', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT category FROM inventory WHERE category IS NOT NULL');
    res.json(result.rows.map(r => r.category));
  } catch (error) {
    console.error('Categories error:', error);
    res.json(['Electronics', 'Furniture', 'Office Supplies']);
  }
});

// ---------- SALES ----------
app.get('/sales', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sales ORDER BY sale_date DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Sales error:', error);
    res.json([]);
  }
});

app.post('/sales', auth, async (req, res) => {
  try {
    const { customer_id, item_name, quantity, unit_price, total_amount, payment_method } = req.body;
    const result = await pool.query(
      `INSERT INTO sales (customer_id, item_name, quantity, unit_price, total_amount, payment_method)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [customer_id, item_name, quantity, unit_price, total_amount, payment_method]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create sale error:', error);
    res.status(500).json({ error: 'Failed to create sale' });
  }
});

// ---------- NOTIFICATIONS ----------
app.get('/notifications', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Notifications error:', error);
    res.json([]);
  }
});

app.get('/notifications/unread-count', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM notifications WHERE is_read = false');
    res.json({ unreadCount: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Unread count error:', error);
    res.json({ unreadCount: 0 });
  }
});

// ---------- FINANCIAL ----------
app.get('/financial', auth, async (req, res) => {
  try {
    const loans = await pool.query('SELECT COUNT(*) as total_loans, COALESCE(SUM(principal_amount), 0) as total_loans_amount FROM loans');
    const customers = await pool.query('SELECT COUNT(*) FROM customers');
    const payments = await pool.query('SELECT COALESCE(SUM(amount_paid), 0) as total_paid FROM loan_payments');
    const expenses = await pool.query('SELECT COALESCE(SUM(amount), 0) as total_expenses FROM expenses');
    
    res.json({
      summary: {
        totalCustomers: parseInt(customers.rows[0].count),
        totalLoans: parseInt(loans.rows[0].total_loans),
        totalRevenue: parseFloat(payments.rows[0].total_paid),
        totalExpenses: parseFloat(expenses.rows[0].total_expenses)
      }
    });
  } catch (error) {
    console.error('Financial error:', error);
    res.json({ summary: { totalCustomers: 0, totalLoans: 0, totalRevenue: 0, totalExpenses: 0 } });
  }
});

// ---------- REPORTS ----------
app.get('/reports/dashboard', auth, async (req, res) => {
  try {
    const customers = await pool.query('SELECT COUNT(*) FROM customers');
    const loans = await pool.query('SELECT COUNT(*) FROM loans WHERE status = $1', ['active']);
    const payments = await pool.query('SELECT COALESCE(SUM(amount_paid), 0) as total_paid FROM loan_payments');
    const expenses = await pool.query('SELECT COALESCE(SUM(amount), 0) as total_expenses FROM expenses');
    
    res.json({
      stats: {
        totalCustomers: parseInt(customers.rows[0].count),
        activeLoans: parseInt(loans.rows[0].count),
        totalRevenue: parseFloat(payments.rows[0].total_paid),
        totalExpenses: parseFloat(expenses.rows[0].total_expenses)
      },
      chartData: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        values: [150000, 180000, 200000, 220000, 240000, 260000]
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.json({ stats: { totalCustomers: 0, activeLoans: 0, totalRevenue: 0, totalExpenses: 0 } });
  }
});

// ---------- CAPITAL ----------
app.get('/capital/transactions', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM capital_transactions ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Capital transactions error:', error);
    res.json([]);
  }
});

// ---------- AUDIT ----------
app.get('/audit', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50');
    res.json(result.rows);
  } catch (error) {
    console.error('Audit error:', error);
    res.json([]);
  }
});

// ---------- SETTINGS ----------
app.get('/settings', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings');
    const settings = {};
    result.rows.forEach(row => { settings[row.key] = row.value; });
    res.json(settings);
  } catch (error) {
    console.error('Settings error:', error);
    res.json({ companyName: 'Polly Consults', currency: 'UGX' });
  }
});

// ---------- AUTH ME ----------
app.get('/auth/me', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, full_name FROM admins WHERE id = $1', [req.user.id]);
    res.json(result.rows[0] || { username: req.user.username });
  } catch (error) {
    console.error('Auth me error:', error);
    res.json({ username: req.user.username });
  }
});

// ==================== 404 ====================
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ==================== ERROR HANDLER ====================
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
module.exports.handler = serverless(app);