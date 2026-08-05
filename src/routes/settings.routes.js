const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth.middleware');

// Get settings
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings WHERE id = TRUE');
    if (result.rows.length === 0) {
      // Create default settings if none exist
      await pool.query('INSERT INTO settings (id) VALUES (TRUE)');
      const newResult = await pool.query('SELECT * FROM settings WHERE id = TRUE');
      return res.json(newResult.rows[0]);
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update settings
router.put('/', authMiddleware, async (req, res) => {
  try {
    const {
      business_name,
      business_logo_url,
      currency,
      default_interest_rate,
      default_interest_type,
      low_capital_threshold,
      phone,
      email,
      address
    } = req.body;

    const result = await pool.query(
      `UPDATE settings 
       SET business_name = $1, 
           business_logo_url = $2, 
           currency = $3, 
           default_interest_rate = $4, 
           default_interest_type = $5, 
           low_capital_threshold = $6,
           phone = $7,
           email = $8,
           address = $9,
           updated_at = NOW()
       WHERE id = TRUE
       RETURNING *`,
      [business_name, business_logo_url, currency, default_interest_rate, default_interest_type, low_capital_threshold, phone, email, address]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Settings not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;