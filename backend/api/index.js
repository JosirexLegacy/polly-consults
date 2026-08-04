const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');

const app = express();

console.log('🚀 Backend starting...');

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

// Your routes
try {
  app.use('/auth', require('../src/routes/auth.routes'));
  console.log('✅ Auth routes mounted');
} catch (error) {
  console.error('❌ Auth error:', error.message);
}

// 404 handler
app.use((req, res) => {
  console.log(`❌ 404: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    available: ['/', '/health', '/test', '/auth/login']
  });
});

module.exports = app;
module.exports.handler = serverless(app);