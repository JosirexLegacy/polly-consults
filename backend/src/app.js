// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'LSM API is running' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'LSM API is running' });
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'LSM API is running',
    version: '1.0.0'
  });
});

// Mount routes - FIXED NAMES (singular, matching your files)
try {
  const auth = require('./routes/auth.routes');
  app.use('/auth', auth);
  app.use('/api/auth', auth);
  console.log('✅ Auth mounted');
} catch (error) {
  console.error('❌ Auth error:', error.message);
}

try {
  const customer = require('./routes/customer.routes');
  app.use('/customers', customer);
  app.use('/api/customers', customer);
  console.log('✅ Customers mounted');
} catch (error) {
  console.error('❌ Customers error:', error.message);
}

try {
  const loan = require('./routes/loan.routes');
  app.use('/loans', loan);
  app.use('/api/loans', loan);
  console.log('✅ Loans mounted');
} catch (error) {
  console.error('❌ Loans error:', error.message);
}

try {
  const payment = require('./routes/payment.routes');
  app.use('/payments', payment);
  app.use('/api/payments', payment);
  console.log('✅ Payments mounted');
} catch (error) {
  console.error('❌ Payments error:', error.message);
}

try {
  const expense = require('./routes/expense.routes');
  app.use('/expenses', expense);
  app.use('/api/expenses', expense);
  console.log('✅ Expenses mounted');
} catch (error) {
  console.error('❌ Expenses error:', error.message);
}

try {
  const report = require('./routes/report.routes');
  app.use('/reports', report);
  app.use('/api/reports', report);
  console.log('✅ Reports mounted');
} catch (error) {
  console.error('❌ Reports error:', error.message);
}

try {
  const capital = require('./routes/capital.routes');
  app.use('/capital', capital);
  app.use('/api/capital', capital);
  console.log('✅ Capital mounted');
} catch (error) {
  console.error('❌ Capital error:', error.message);
}

try {
  const settings = require('./routes/settings.routes');
  app.use('/settings', settings);
  app.use('/api/settings', settings);
  console.log('✅ Settings mounted');
} catch (error) {
  console.error('❌ Settings error:', error.message);
}

try {
  const notification = require('./routes/notification.routes');
  app.use('/notifications', notification);
  app.use('/api/notifications', notification);
  console.log('✅ Notifications mounted');
} catch (error) {
  console.error('❌ Notifications error:', error.message);
}

try {
  const inventory = require('./routes/inventory.routes');
  app.use('/inventory', inventory);
  app.use('/api/inventory', inventory);
  console.log('✅ Inventory mounted');
} catch (error) {
  console.error('❌ Inventory error:', error.message);
}

try {
  const audit = require('./routes/audit.routes');
  app.use('/audit', audit);
  app.use('/api/audit', audit);
  console.log('✅ Audit mounted');
} catch (error) {
  console.error('❌ Audit error:', error.message);
}

try {
  const financial = require('./routes/financial.routes');
  app.use('/financial', financial);
  app.use('/api/financial', financial);
  console.log('✅ Financial mounted');
} catch (error) {
  console.error('❌ Financial error:', error.message);
}

try {
  const sales = require('./routes/sales.routes');
  app.use('/sales', sales);
  app.use('/api/sales', sales);
  console.log('✅ Sales mounted');
} catch (error) {
  console.error('❌ Sales error:', error.message);
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;