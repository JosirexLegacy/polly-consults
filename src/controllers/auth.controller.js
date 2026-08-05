const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('🔍 Login attempt for:', username);
    console.log('🔍 Password provided:', password ? 'yes' : 'no');

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const result = await pool.query(
      'SELECT id, username, password_hash, full_name FROM admins WHERE username = $1',
      [username]
    );

    console.log('🔍 User found:', result.rows.length > 0);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = result.rows[0];
    console.log('🔍 Password hash in DB:', admin.password_hash);

    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    console.log('🔍 Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // ... rest of the code
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};