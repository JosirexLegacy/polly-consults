const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth.middleware');

// Get all notifications
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM notifications 
      ORDER BY created_at DESC 
      LIMIT 20
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get unread count
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE is_read = FALSE'
    );
    res.json({ unread: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Mark notification as read
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE notifications 
       SET is_read = TRUE 
       WHERE id = $1 
       RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Mark all notifications as read
router.patch('/read-all', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE is_read = FALSE`
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

// Create a notification (for system events)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { type, message, related_loan_id } = req.body;
    
    const validTypes = ['loan_due_today', 'loan_overdue', 'large_expense', 'low_capital'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid notification type' });
    }
    
    const result = await pool.query(
      `INSERT INTO notifications (type, message, related_loan_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [type, message, related_loan_id || null]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Delete notification
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM notifications WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Generate system notifications (run on schedule or manually)
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const results = [];
    
    // Check for overdue loans
    const overdueLoans = await pool.query(`
      SELECT id, customer_id, remaining_balance, due_date
      FROM loans 
      WHERE status = 'active' AND due_date < NOW()
    `);
    
    for (const loan of overdueLoans.rows) {
      const customer = await pool.query(
        'SELECT name FROM customers WHERE id = $1',
        [loan.customer_id]
      );
      
      const message = `Loan for ${customer.rows[0]?.name || 'Unknown'} is overdue by ${Math.ceil((Date.now() - new Date(loan.due_date)) / (1000 * 60 * 60 * 24))} days. Balance: ${loan.remaining_balance}`;
      
      const result = await pool.query(
        `INSERT INTO notifications (type, message, related_loan_id)
         VALUES ('loan_overdue', $1, $2)
         RETURNING *`,
        [message, loan.id]
      );
      results.push(result.rows[0]);
    }
    
    // Check for low capital
    const capital = await pool.query(
      'SELECT current_amount FROM business_capital WHERE id = TRUE'
    );
    const settings = await pool.query(
      'SELECT low_capital_threshold FROM settings WHERE id = TRUE'
    );
    
    const threshold = settings.rows[0]?.low_capital_threshold || 1000000;
    if (capital.rows[0]?.current_amount < threshold) {
      const result = await pool.query(
        `INSERT INTO notifications (type, message)
         VALUES ('low_capital', $1)
         RETURNING *`,
        [`Capital is below UGX ${threshold.toLocaleString()}. Current: ${capital.rows[0]?.current_amount.toLocaleString()}`]
      );
      results.push(result.rows[0]);
    }
    
    res.json({ 
      message: `Generated ${results.length} notifications`,
      notifications: results 
    });
  } catch (error) {
    console.error('Error generating notifications:', error);
    res.status(500).json({ error: 'Failed to generate notifications' });
  }
});

module.exports = router;