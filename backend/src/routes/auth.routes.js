const express = require('express');
const { body, validationResult } = require('express-validator');
const { adminLogin, getCurrentAdmin } = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// Login route
router.post(
  '/login',
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  adminLogin
);

// Get current admin (protected route)
router.get('/me', authMiddleware, getCurrentAdmin);

module.exports = router;