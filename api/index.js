const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const app = express();

console.log('🚀 Backend starting...');

// ==================== CORS FIX ====================
app.use(cors({
  origin: [
    'https://polly-consults-frontend.vercel.app',
    'https://polly-consults-frontend.vercel.app/',
    'http://localhost:3000',
    'http://localhost:5000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.use(express.json());

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

app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Polly Consults API is running!',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Healthy' });
});

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

// ==================== LOAD ALL ROUTE FILES ====================
const routeFiles = [
  'auth', 'customers', 'loans', 'payments', 'expenses', 'reports',
  'inventory', 'sales', 'capital', 'financial', 'notifications', 
  'audit', 'settings'
];

routeFiles.forEach(routeName => {
  try {
    const routePath = `./src/routes/${routeName}.routes.js`;
    console.log(`📁 Checking for ${routePath}...`);
    if (fs.existsSync(routePath)) {
      const route = require(routePath);
      app.use(`/${routeName}`, route);
      console.log(`✅ ${routeName} routes mounted`);
    } else {
      console.log(`⚠️ ${routeName}.routes.js not found at ${routePath}`);
    }
  } catch (error) {
    console.error(`❌ Error loading ${routeName}:`, error.message);
  }
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