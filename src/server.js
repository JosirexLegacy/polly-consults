const app = require('./app');
const pool = require('./config/db');
const { createInitialAdmin } = require('./controllers/auth.controller');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

// Create initial admin if none exists
createInitialAdmin();

app.listen(PORT, () => {
  console.log(`LSM backend running on http://localhost:${PORT}`);
});