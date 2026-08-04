const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');

const app = express();

app.use(cors());
app.use(express.json());

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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path
  });
});

// Vercel serverless export
module.exports = app;
module.exports.handler = serverless(app);