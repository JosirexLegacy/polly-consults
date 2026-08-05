const express = require('express');
const router = express.Router();
const { adminLogin, getCurrentAdmin } = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Login route - simple version
router.post('/login', adminLogin);

// Get current admin (protected route)
router.get('/me', authMiddleware, getCurrentAdmin);

module.exports = router;