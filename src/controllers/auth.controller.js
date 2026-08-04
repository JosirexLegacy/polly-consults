const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Get admin from database
    const result = await pool.query(
      'SELECT id, username, password_hash, full_name FROM admins WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = result.rows[0];

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: admin.id, username: admin.username, full_name: admin.full_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        full_name: admin.full_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getCurrentAdmin = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, full_name, created_at FROM admins WHERE id = $1',
      [req.admin.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Temporary function to create the first admin (run once)
const createInitialAdmin = async () => {
  try {
    const checkResult = await pool.query('SELECT * FROM admins LIMIT 1');
    
    if (checkResult.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        'INSERT INTO admins (username, password_hash, full_name) VALUES ($1, $2, $3)',
        ['admin', hashedPassword, 'System Administrator']
      );
      console.log('✅ Initial admin created: username=admin, password=admin123');
    } else {
      console.log('✅ Admin already exists');
    }
  } catch (error) {
    console.error('Error creating initial admin:', error);
  }
};

module.exports = {
  adminLogin,
  getCurrentAdmin,
  createInitialAdmin
};