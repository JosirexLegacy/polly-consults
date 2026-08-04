// This file is for Vercel serverless deployment
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const serverless = require('serverless-http');
require('dotenv').config();

const app = express();

app.use(helmet());
app.use(cors({
  origin: ['https://polly-consults-frontend.vercel.app', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Root route
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Polly Consults API is running on Vercel',
    environment: process.env.NODE_ENV || 'production'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API is healthy',
    timestamp: new Date().toISOString()
  });
});

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Test route is working!' });
});

// Mount routes
app.use('/auth', require('../src/routes/auth.routes'));
app.use('/customers', require('../src/routes/customer.routes'));
app.use('/loans', require('../src/routes/loan.routes'));
app.use('/payments', require('../src/routes/payment.routes'));
app.use('/expenses', require('../src/routes/expense.routes'));
app.use('/reports', require('../src/routes/report.routes'));
app.use('/notifications', require('../src/routes/notification.routes'));
app.use('/settings', require('../src/routes/settings.routes'));
app.use('/capital', require('../src/routes/capital.routes'));
app.use('/inventory', require('../src/routes/inventory.routes'));
app.use('/sales', require('../src/routes/sales.routes'));
app.use('/audit', require('../src/routes/audit.routes'));
app.use('/financial', require('../src/routes/financial.routes'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method,
    available: ['/', '/health', '/test', '/auth/login', '/customers', '/loans']
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: err.message || 'Internal server error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Vercel serverless export
module.exports = app;
module.exports.handler = serverless(app);