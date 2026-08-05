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

// Simple auth middleware
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

// Root route
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API is working!',
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

// LOGIN - Direct endpoint (already working)
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

// ==================== API ROUTES ====================

// Customers
app.get('/customers', authMiddleware, (req, res) => {
  res.json({ message: 'Customers list - coming soon!' });
});

app.post('/customers', authMiddleware, (req, res) => {
  res.json({ message: 'Create customer - coming soon!' });
});

app.get('/customers/:id', authMiddleware, (req, res) => {
  res.json({ message: `Customer ${req.params.id} - coming soon!` });
});

// Loans
app.get('/loans', authMiddleware, (req, res) => {
  res.json({ message: 'Loans list - coming soon!' });
});

app.post('/loans', authMiddleware, (req, res) => {
  res.json({ message: 'Create loan - coming soon!' });
});

app.get('/loans/:id', authMiddleware, (req, res) => {
  res.json({ message: `Loan ${req.params.id} - coming soon!` });
});

// Payments
app.get('/payments', authMiddleware, (req, res) => {
  res.json({ message: 'Payments list - coming soon!' });
});

app.post('/payments', authMiddleware, (req, res) => {
  res.json({ message: 'Create payment - coming soon!' });
});

// Expenses
app.get('/expenses', authMiddleware, (req, res) => {
  res.json({ message: 'Expenses list - coming soon!' });
});

app.post('/expenses', authMiddleware, (req, res) => {
  res.json({ message: 'Create expense - coming soon!' });
});

// Reports
app.get('/reports', authMiddleware, (req, res) => {
  res.json({ message: 'Reports - coming soon!' });
});

app.get('/reports/dashboard', authMiddleware, (req, res) => {
  res.json({ message: 'Dashboard report - coming soon!' });
});

// Inventory
app.get('/inventory', authMiddleware, (req, res) => {
  res.json({ message: 'Inventory list - coming soon!' });
});

app.get('/inventory/products', authMiddleware, (req, res) => {
  res.json({ message: 'Products list - coming soon!' });
});

// Sales
app.get('/sales', authMiddleware, (req, res) => {
  res.json({ message: 'Sales list - coming soon!' });
});

// Notifications
app.get('/notifications', authMiddleware, (req, res) => {
  res.json({ notifications: [] });
});

app.get('/notifications/unread-count', authMiddleware, (req, res) => {
  res.json({ unreadCount: 0 });
});

// Financial
app.get('/financial', authMiddleware, (req, res) => {
  res.json({ 
    totalLoans: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    totalExpenses: 0
  });
});

// Audit
app.get('/audit', authMiddleware, (req, res) => {
  res.json({ logs: [] });
});

// Settings
app.get('/settings', authMiddleware, (req, res) => {
  res.json({ settings: {} });
});

// ==================== 404 Handler ====================
app.use((req, res) => {
  console.log(`❌ 404: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    available: ['/', '/health', '/test', '/auth/login', '/customers', '/loans', '/payments', '/expenses', '/reports', '/inventory', '/sales', '/notifications']
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
module.exports.handler = serverless(app);