const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'LSM API is running' });
});

// Mount routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/customers', require('./routes/customer.routes'));
app.use('/api/loans', require('./routes/loan.routes'));
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/expenses', require('./routes/expense.routes'));
app.use('/api/reports', require('./routes/report.routes'));
app.use('/api/capital', require('./routes/capital.routes'));
app.use('/api/settings', require('./routes/settings.routes'));
app.use('/api/notifications', require('./routes/notification.routes')); 
app.use('/api/inventory', require('./routes/inventory.routes'));
app.use('/api/audit', require('./routes/audit.routes')); 
app.use('/api/financial', require('./routes/financial.routes'));
app.use('/api/sales', require('./routes/sales.routes'));// ← ADD THIS LINE

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

module.exports = app;