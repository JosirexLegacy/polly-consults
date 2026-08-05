const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');
const jwt = require('jsonwebtoken');

const app = express();

console.log('🚀 Backend starting...');

app.use(cors());
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.path}`);
  next();
});

// ==================== AUTH MIDDLEWARE ====================
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

// ==================== PUBLIC ROUTES ====================

// Root route
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Polly Consults API is running!',
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Healthy' });
});

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Test route works!' });
});

// ==================== LOGIN ====================
app.post('/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('🔍 Login attempt for:', username);

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      const token = jwt.sign(
        { username: ADMIN_USERNAME, role: 'admin' },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      return res.json({
        success: true,
        token,
        admin: {
          username: ADMIN_USERNAME,
          full_name: 'System Administrator'
        }
      });
    }

    return res.status(401).json({ error: 'Invalid credentials' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== PROTECTED ROUTES ====================

// ---------- AUTH ----------
app.get('/auth/me', authMiddleware, (req, res) => {
  res.json({
    username: req.admin.username,
    full_name: 'System Administrator',
    role: 'admin'
  });
});

// ---------- CUSTOMERS ----------
app.get('/customers', authMiddleware, (req, res) => {
  res.json([
    { id: 1, name: 'John Doe', phone: '0712345678', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', phone: '0723456789', email: 'jane@example.com' }
  ]);
});

app.get('/customers/:id', authMiddleware, (req, res) => {
  res.json({ id: parseInt(req.params.id), name: 'Customer ' + req.params.id, phone: '0712345678' });
});

app.post('/customers', authMiddleware, (req, res) => {
  res.status(201).json({ id: Date.now(), ...req.body });
});

app.put('/customers/:id', authMiddleware, (req, res) => {
  res.json({ id: parseInt(req.params.id), ...req.body });
});

app.delete('/customers/:id', authMiddleware, (req, res) => {
  res.json({ message: 'Customer ' + req.params.id + ' deleted' });
});

// ---------- LOANS ----------
app.get('/loans', authMiddleware, (req, res) => {
  res.json([
    { id: 1, customer_id: 1, amount: 1000000, status: 'active', date: '2026-01-15' },
    { id: 2, customer_id: 2, amount: 500000, status: 'completed', date: '2026-02-20' }
  ]);
});

app.get('/loans/:id', authMiddleware, (req, res) => {
  res.json({ id: parseInt(req.params.id), customer_id: 1, amount: 1000000, status: 'active' });
});

app.post('/loans', authMiddleware, (req, res) => {
  res.status(201).json({ id: Date.now(), ...req.body });
});

app.put('/loans/:id', authMiddleware, (req, res) => {
  res.json({ id: parseInt(req.params.id), ...req.body });
});

app.delete('/loans/:id', authMiddleware, (req, res) => {
  res.json({ message: 'Loan ' + req.params.id + ' deleted' });
});

// ---------- PAYMENTS ----------
app.get('/payments', authMiddleware, (req, res) => {
  res.json([
    { id: 1, loan_id: 1, amount: 100000, date: '2026-01-20', method: 'cash' },
    { id: 2, loan_id: 1, amount: 150000, date: '2026-02-20', method: 'mobile' }
  ]);
});

app.get('/payments/:id', authMiddleware, (req, res) => {
  res.json({ id: parseInt(req.params.id), loan_id: 1, amount: 100000, method: 'cash' });
});

app.post('/payments', authMiddleware, (req, res) => {
  res.status(201).json({ id: Date.now(), ...req.body });
});

app.delete('/payments/:id', authMiddleware, (req, res) => {
  res.json({ message: 'Payment ' + req.params.id + ' deleted' });
});

// ---------- EXPENSES ----------
app.get('/expenses', authMiddleware, (req, res) => {
  res.json([
    { id: 1, description: 'Office rent', amount: 200000, category: 'rent', date: '2026-01-01' },
    { id: 2, description: 'Utilities', amount: 50000, category: 'utilities', date: '2026-01-15' }
  ]);
});

app.post('/expenses', authMiddleware, (req, res) => {
  res.status(201).json({ id: Date.now(), ...req.body });
});

// ---------- REPORTS ----------
app.get('/reports', authMiddleware, (req, res) => {
  res.json({
    summary: {
      totalCustomers: 156,
      activeLoans: 89,
      totalRevenue: 1250000,
      totalExpenses: 450000
    }
  });
});

app.get('/reports/dashboard', authMiddleware, (req, res) => {
  res.json({
    stats: {
      totalCustomers: 156,
      activeLoans: 89,
      totalRevenue: 1250000,
      totalExpenses: 450000
    },
    chartData: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      values: [150000, 180000, 200000, 220000, 240000, 260000]
    },
    recentActivity: []
  });
});

// ---------- INVENTORY ----------
app.get('/inventory', authMiddleware, (req, res) => {
  res.json([
    { id: 1, name: 'Laptop', quantity: 10, price: 1500000 },
    { id: 2, name: 'Chair', quantity: 25, price: 150000 }
  ]);
});

app.get('/inventory/products', authMiddleware, (req, res) => {
  res.json([
    { id: 1, name: 'Laptop', category: 'Electronics', stock: 10 },
    { id: 2, name: 'Chair', category: 'Furniture', stock: 25 }
  ]);
});

app.get('/inventory/categories', authMiddleware, (req, res) => {
  res.json(['Electronics', 'Furniture', 'Office Supplies', 'Equipment', 'Stationery']);
});

// ---------- SALES ----------
app.get('/sales', authMiddleware, (req, res) => {
  res.json([
    { id: 1, product: 'Laptop', quantity: 2, total: 3000000, date: '2026-03-01' },
    { id: 2, product: 'Chair', quantity: 5, total: 750000, date: '2026-03-05' }
  ]);
});

app.post('/sales', authMiddleware, (req, res) => {
  res.status(201).json({ id: Date.now(), ...req.body });
});

app.get('/sales/:id', authMiddleware, (req, res) => {
  res.json({ id: parseInt(req.params.id), product: 'Laptop', quantity: 2, total: 3000000 });
});

app.put('/sales/:id', authMiddleware, (req, res) => {
  res.json({ id: parseInt(req.params.id), ...req.body });
});

app.delete('/sales/:id', authMiddleware, (req, res) => {
  res.json({ message: 'Sale ' + req.params.id + ' deleted' });
});

// ---------- FINANCIAL ----------
app.get('/financial', authMiddleware, (req, res) => {
  res.json({
    summary: {
      totalRevenue: 1250000,
      totalExpenses: 450000,
      totalLoans: 3200000,
      totalCustomers: 156,
      activeLoans: 89,
      completedLoans: 67
    },
    monthlyData: [
      { month: 'Jan', revenue: 150000, expenses: 50000 },
      { month: 'Feb', revenue: 180000, expenses: 55000 },
      { month: 'Mar', revenue: 200000, expenses: 60000 }
    ],
    recentTransactions: []
  });
});

// ---------- CAPITAL ----------
app.get('/capital', authMiddleware, (req, res) => {
  res.json({
    currentAmount: 2500000,
    totalInvested: 5000000,
    totalWithdrawn: 2500000,
    transactions: [
      { id: 1, type: 'investment', amount: 1000000, date: '2026-01-01', description: 'Initial capital' },
      { id: 2, type: 'withdrawal', amount: 500000, date: '2026-02-15', description: 'Business expenses' }
    ]
  });
});

app.get('/capital/transactions', authMiddleware, (req, res) => {
  res.json([
    { id: 1, type: 'investment', amount: 1000000, date: '2026-01-01', description: 'Initial capital' },
    { id: 2, type: 'withdrawal', amount: 500000, date: '2026-02-15', description: 'Business expenses' },
    { id: 3, type: 'investment', amount: 2000000, date: '2026-03-01', description: 'Additional capital' }
  ]);
});

app.post('/capital/update', authMiddleware, (req, res) => {
  const { amount, type, description } = req.body;
  res.json({ 
    success: true, 
    message: 'Capital updated successfully',
    transaction: {
      id: Date.now(),
      type: type || 'investment',
      amount: amount || 1000000,
      date: new Date().toISOString(),
      description: description || 'Capital update'
    },
    newAmount: 3000000
  });
});

// ---------- NOTIFICATIONS ----------
app.get('/notifications', authMiddleware, (req, res) => {
  res.json([
    { id: 1, title: 'Welcome', message: 'Welcome to Polly Consults!', read: false, created_at: new Date().toISOString() },
    { id: 2, title: 'System Ready', message: 'Your system is ready to use.', read: true, created_at: new Date().toISOString() }
  ]);
});

app.get('/notifications/unread-count', authMiddleware, (req, res) => {
  res.json({ unreadCount: 1 });
});

app.post('/notifications/:id/read', authMiddleware, (req, res) => {
  res.json({ message: 'Notification ' + req.params.id + ' marked as read' });
});

// ---------- AUDIT ----------
app.get('/audit', authMiddleware, (req, res) => {
  res.json([
    { id: 1, action: 'Login', user: 'admin', timestamp: new Date().toISOString() },
    { id: 2, action: 'Created customer', user: 'admin', timestamp: new Date().toISOString() }
  ]);
});

// ---------- SETTINGS ----------
app.get('/settings', authMiddleware, (req, res) => {
  res.json({
    companyName: 'Polly Consults',
    currency: 'UGX',
    theme: 'light',
    notifications: true
  });
});

app.put('/settings', authMiddleware, (req, res) => {
  res.json({ message: 'Settings updated', ...req.body });
});

// ==================== 404 HANDLER ====================
app.use((req, res) => {
  console.log(`❌ 404: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path
  });
});

// ==================== ERROR HANDLER ====================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  console.error('Stack:', err.stack);
  res.status(500).json({ 
    error: err.message || 'Internal server error',
    path: req.path
  });
});

module.exports = app;
module.exports.handler = serverless(app);