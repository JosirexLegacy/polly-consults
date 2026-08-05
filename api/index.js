const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');
const fs = require('fs');

const app = express();

console.log('🚀 Backend starting...');
console.log('📁 Current directory:', __dirname);
console.log('📁 Files in current directory:', fs.readdirSync('.').join(', '));
console.log('📁 Does src/routes/auth.routes.js exist?', fs.existsSync('./src/routes/auth.routes.js'));

app.use(cors());
app.use(express.json());

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.path}`);
  next();
});

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

// Mount routes with detailed error logging
try {
  console.log('📁 Attempting to load auth routes...');
  const authRoutes = require('./src/routes/auth.routes');
  console.log('📁 Auth routes loaded, type:', typeof authRoutes);
  app.use('/auth', authRoutes);
  console.log('✅ Auth routes mounted');
} catch (error) {
  console.error('❌ Auth error:', error.message);
  console.error('❌ Auth error stack:', error.stack);
}

try {
  app.use('/customers', require('./src/routes/customer.routes'));
  console.log('✅ Customers routes mounted');
} catch (error) {
  console.error('❌ Customers error:', error.message);
}

try {
  app.use('/loans', require('./src/routes/loan.routes'));
  console.log('✅ Loans routes mounted');
} catch (error) {
  console.error('❌ Loans error:', error.message);
}

try {
  app.use('/payments', require('./src/routes/payment.routes'));
  console.log('✅ Payments routes mounted');
} catch (error) {
  console.error('❌ Payments error:', error.message);
}

try {
  app.use('/expenses', require('./src/routes/expense.routes'));
  console.log('✅ Expenses routes mounted');
} catch (error) {
  console.error('❌ Expenses error:', error.message);
}

try {
  app.use('/reports', require('./src/routes/report.routes'));
  console.log('✅ Reports routes mounted');
} catch (error) {
  console.error('❌ Reports error:', error.message);
}

try {
  app.use('/inventory', require('./src/routes/inventory.routes'));
  console.log('✅ Inventory routes mounted');
} catch (error) {
  console.error('❌ Inventory error:', error.message);
}

try {
  app.use('/sales', require('./src/routes/sales.routes'));
  console.log('✅ Sales routes mounted');
} catch (error) {
  console.error('❌ Sales error:', error.message);
}

// 404 handler
app.use((req, res) => {
  console.log(`❌ 404: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    available: ['/', '/health', '/test', '/auth/login', '/customers', '/loans', '/payments', '/expenses', '/reports', '/inventory', '/sales']
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  console.error('Stack:', err.stack);
  res.status(500).json({ 
    error: err.message || 'Internal server error' 
  });
});

module.exports = app;
module.exports.handler = serverless(app);