const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();

console.log('🚀 Polly Consults API starting...');

// ==================== DATABASE ====================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // required for Neon
});

pool.on('error', (err) => {
  // Prevents an idle-client error from crashing the whole function process.
  console.error('[db] Unexpected error on idle client', err);
});

// ==================== MIDDLEWARE ====================
app.use(
  cors({
    origin: [
      'https://polly-consults-frontend.vercel.app',
      'http://localhost:3000',
    ],
    credentials: true,
  })
);
app.use(express.json());

app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.path}`);
  next();
});

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Wrap async route handlers so a thrown/rejected error reaches the error
// handler below instead of crashing the function or hanging the request.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ==================== ROOT / HEALTH ====================
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Polly Consults API', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

// ==================== AUTH ====================
// Login stays on the env-var check for now since it's already confirmed
// working in production. Swap to the DB-backed version (query `admins`,
// bcrypt.compare) once the admins table + a hash you've generated yourself
// (see scripts/generate-hash.js if you want it) are confirmed in Neon.
app.post(
  '/auth/login',
  asyncHandler(async (req, res) => {
    const { username, password } = req.body || {};
    console.log('🔍 Login attempt for:', username);

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { username: ADMIN_USERNAME, role: 'admin' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      token,
      admin: { username: ADMIN_USERNAME, full_name: 'System Administrator' },
    });
  })
);

app.get('/auth/me', authMiddleware, (req, res) => {
  res.json({ username: req.admin.username, full_name: 'System Administrator' });
});

// ==================== CUSTOMERS ====================
app.get(
  '/customers',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await pool.query('SELECT * FROM customers ORDER BY created_at DESC');
    res.json(result.rows);
  })
);

app.get(
  '/customers/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await pool.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Customer not found' });
    res.json(result.rows[0]);
  })
);

app.post(
  '/customers',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { name, phone, email, address } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });
    const result = await pool.query(
      'INSERT INTO customers (name, phone, email, address) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, phone || null, email || null, address || null]
    );
    res.status(201).json(result.rows[0]);
  })
);

// ==================== LOANS ====================
app.get(
  '/loans',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await pool.query(`
      SELECT l.*, c.name as customer_name
      FROM loans l
      LEFT JOIN customers c ON l.customer_id = c.id
      ORDER BY l.created_at DESC
    `);
    res.json(result.rows);
  })
);

app.get(
  '/loans/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await pool.query('SELECT * FROM loans WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Loan not found' });
    res.json(result.rows[0]);
  })
);

app.post(
  '/loans',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { customer_id, principal_amount, interest_rate, total_payable, loan_date, due_date } =
      req.body || {};
    if (!customer_id || !principal_amount) {
      return res.status(400).json({ error: 'customer_id and principal_amount are required' });
    }
    const result = await pool.query(
      `INSERT INTO loans (customer_id, principal_amount, interest_rate, total_payable, remaining_balance, loan_date, due_date)
       VALUES ($1, $2, $3, $4, $4, $5, $6) RETURNING *`,
      [customer_id, principal_amount, interest_rate || 0, total_payable, loan_date || null, due_date || null]
    );
    res.status(201).json(result.rows[0]);
  })
);

// ==================== PAYMENTS ====================
app.get(
  '/payments',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await pool.query(`
      SELECT p.*, l.customer_id, c.name as customer_name
      FROM loan_payments p
      JOIN loans l ON p.loan_id = l.id
      LEFT JOIN customers c ON l.customer_id = c.id
      ORDER BY p.payment_date DESC
    `);
    res.json(result.rows);
  })
);

app.post(
  '/payments',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { loan_id, amount_paid, payment_method } = req.body || {};
    if (!loan_id || !amount_paid) {
      return res.status(400).json({ error: 'loan_id and amount_paid are required' });
    }

    const loanResult = await pool.query('SELECT remaining_balance FROM loans WHERE id = $1', [loan_id]);
    if (!loanResult.rows[0]) return res.status(404).json({ error: 'Loan not found' });

    const newBalance = loanResult.rows[0].remaining_balance - amount_paid;

    const result = await pool.query(
      `INSERT INTO loan_payments (loan_id, amount_paid, remaining_balance_after, payment_method)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [loan_id, amount_paid, newBalance, payment_method || 'cash']
    );

    await pool.query(
      `UPDATE loans SET remaining_balance = $1, amount_paid = amount_paid + $2,
       status = CASE WHEN $1 <= 0 THEN 'completed' ELSE status END
       WHERE id = $3`,
      [newBalance, amount_paid, loan_id]
    );

    res.status(201).json(result.rows[0]);
  })
);

// ==================== EXPENSES ====================
app.get(
  '/expenses',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await pool.query('SELECT * FROM expenses ORDER BY created_at DESC');
    res.json(result.rows);
  })
);

app.post(
  '/expenses',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { description, amount, category, date } = req.body || {};
    if (!description || !amount) {
      return res.status(400).json({ error: 'description and amount are required' });
    }
    const result = await pool.query(
      'INSERT INTO expenses (description, amount, category, date) VALUES ($1, $2, $3, $4) RETURNING *',
      [description, amount, category || null, date || null]
    );
    res.status(201).json(result.rows[0]);
  })
);

// ==================== INVENTORY ====================
app.get(
  '/inventory/products',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await pool.query('SELECT * FROM inventory ORDER BY created_at DESC');
    res.json(result.rows);
  })
);

app.get(
  '/inventory/categories',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await pool.query('SELECT DISTINCT category FROM inventory WHERE category IS NOT NULL');
    res.json(result.rows.map((r) => r.category));
  })
);

// ==================== SALES ====================
app.get(
  '/sales',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await pool.query('SELECT * FROM sales ORDER BY sale_date DESC');
    res.json(result.rows);
  })
);

app.post(
  '/sales',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { customer_id, item_name, quantity, unit_price, total_amount, payment_method } = req.body || {};
    if (!item_name || !quantity || !unit_price) {
      return res.status(400).json({ error: 'item_name, quantity and unit_price are required' });
    }
    const result = await pool.query(
      `INSERT INTO sales (customer_id, item_name, quantity, unit_price, total_amount, payment_method)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [customer_id || null, item_name, quantity, unit_price, total_amount, payment_method || 'cash']
    );
    res.status(201).json(result.rows[0]);
  })
);

// ==================== NOTIFICATIONS ====================
app.get(
  '/notifications',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC');
    res.json(result.rows);
  })
);

app.get(
  '/notifications/unread-count',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await pool.query('SELECT COUNT(*) FROM notifications WHERE is_read = false');
    res.json({ unreadCount: parseInt(result.rows[0].count, 10) });
  })
);

// ==================== FINANCIAL ====================
app.get(
  '/financial',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const [loans, customers, payments, expenses] = await Promise.all([
      pool.query('SELECT COUNT(*) as total_loans, COALESCE(SUM(principal_amount), 0) as total_loans_amount FROM loans'),
      pool.query('SELECT COUNT(*) FROM customers'),
      pool.query('SELECT COALESCE(SUM(amount_paid), 0) as total_paid FROM loan_payments'),
      pool.query('SELECT COALESCE(SUM(amount), 0) as total_expenses FROM expenses'),
    ]);

    res.json({
      totalCustomers: parseInt(customers.rows[0].count, 10),
      totalLoans: parseInt(loans.rows[0].total_loans, 10),
      totalRevenue: parseFloat(payments.rows[0].total_paid),
      totalExpenses: parseFloat(expenses.rows[0].total_expenses),
    });
  })
);

// ==================== REPORTS ====================
app.get(
  '/reports/dashboard',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const [customers, loans, payments, expenses] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM customers'),
      pool.query("SELECT COUNT(*) FROM loans WHERE status = 'active'"),
      pool.query('SELECT COALESCE(SUM(amount_paid), 0) as total_paid FROM loan_payments'),
      pool.query('SELECT COALESCE(SUM(amount), 0) as total_expenses FROM expenses'),
    ]);

    res.json({
      stats: {
        totalCustomers: parseInt(customers.rows[0].count, 10),
        activeLoans: parseInt(loans.rows[0].count, 10),
        totalRevenue: parseFloat(payments.rows[0].total_paid),
        totalExpenses: parseFloat(expenses.rows[0].total_expenses),
      },
    });
  })
);

// ==================== CAPITAL ====================
app.get(
  '/capital/transactions',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await pool.query('SELECT * FROM capital_transactions ORDER BY created_at DESC');
    res.json(result.rows);
  })
);

// ==================== AUDIT ====================
app.get(
  '/audit',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50');
    res.json(result.rows);
  })
);

// ==================== SETTINGS ====================
app.get(
  '/settings',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await pool.query('SELECT * FROM settings');
    const settings = {};
    result.rows.forEach((row) => {
      settings[row.key] = row.value;
    });
    res.json(settings);
  })
);

// ==================== 404 ====================
app.use((req, res) => {
  console.log(`❌ 404: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Route not found', path: req.path });
});

// ==================== GLOBAL ERROR HANDLER ====================
// Every DB-backed route above is wrapped in asyncHandler, so a query
// failure (bad SQL, missing table, connection drop) lands here instead of
// crashing the function or hanging. If a route 500s, check this log line
// in Vercel Functions logs for the real error.
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    detail: process.env.NODE_ENV === 'production' ? undefined : err.message,
  });
});

module.exports = app;
module.exports.handler = serverless(app);