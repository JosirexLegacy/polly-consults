const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth.middleware');

// Get all products (active only by default)
router.get('/products', authMiddleware, async (req, res) => {
  try {
    const { include_archived } = req.query;
    let query = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN inventory_categories c ON p.category_id = c.id
    `;
    
    if (include_archived !== 'true') {
      query += ` WHERE p.is_active = TRUE`;
    }
    
    query += ` ORDER BY p.name`;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single product
router.get('/products/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN inventory_categories c ON p.category_id = c.id
      WHERE p.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create product
router.post('/products', authMiddleware, async (req, res) => {
  try {
    const {
      sku, name, description, category_id, unit_price,
      cost_price, quantity, min_quantity, max_quantity,
      location, supplier, notes
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO products (
        sku, name, description, category_id, unit_price,
        cost_price, quantity, min_quantity, max_quantity,
        location, supplier, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [sku, name, description, category_id, unit_price, cost_price, quantity, min_quantity, max_quantity, location, supplier, notes]
    );
    
    await pool.query(
      `INSERT INTO audit_logs (admin_id, action, entity, entity_id, details)
       VALUES ($1, 'CREATE', 'product', $2, $3::jsonb)`,
      [req.admin.id, result.rows[0].id, JSON.stringify({ name, sku })]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
router.put('/products/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      sku, name, description, category_id, unit_price,
      cost_price, quantity, min_quantity, max_quantity,
      location, supplier, notes
    } = req.body;
    
    const result = await pool.query(
      `UPDATE products 
       SET sku = $1, name = $2, description = $3, category_id = $4,
           unit_price = $5, cost_price = $6, quantity = $7,
           min_quantity = $8, max_quantity = $9, location = $10,
           supplier = $11, notes = $12, updated_at = NOW()
       WHERE id = $13
       RETURNING *`,
      [sku, name, description, category_id, unit_price, cost_price, quantity, min_quantity, max_quantity, location, supplier, notes, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    await pool.query(
      `INSERT INTO audit_logs (admin_id, action, entity, entity_id, details)
       VALUES ($1, 'UPDATE', 'product', $2, $3::jsonb)`,
      [req.admin.id, id, JSON.stringify({ name, sku })]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Archive product (soft delete)
router.patch('/products/:id/archive', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const checkResult = await pool.query(
      'SELECT name, sku FROM products WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const productName = checkResult.rows[0].name;
    
    const result = await pool.query(
      `UPDATE products 
       SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    await pool.query(
      `INSERT INTO audit_logs (admin_id, action, entity, entity_id, details)
       VALUES ($1, 'UPDATE', 'product', $2, $3::jsonb)`,
      [req.admin.id, id, JSON.stringify({ action: 'archived', name: productName })]
    );
    
    res.json({ 
      message: 'Product archived successfully',
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Error archiving product:', error);
    res.status(500).json({ error: 'Failed to archive product' });
  }
});

// Restore archived product
router.patch('/products/:id/restore', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const checkResult = await pool.query(
      'SELECT name FROM products WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const result = await pool.query(
      `UPDATE products 
       SET is_active = TRUE, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    await pool.query(
      `INSERT INTO audit_logs (admin_id, action, entity, entity_id, details)
       VALUES ($1, 'UPDATE', 'product', $2, $3::jsonb)`,
      [req.admin.id, id, JSON.stringify({ action: 'restored', name: result.rows[0].name })]
    );
    
    res.json({ 
      message: 'Product restored successfully',
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Error restoring product:', error);
    res.status(500).json({ error: 'Failed to restore product' });
  }
});

// Delete product (only if no sales or transactions)
router.delete('/products/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const checkResult = await pool.query(
      'SELECT name, sku FROM products WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Check if product has sales
    const salesCheck = await pool.query(
      'SELECT COUNT(*) FROM sale_items WHERE product_id = $1',
      [id]
    );
    
    if (parseInt(salesCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete product with sales history. Archive instead.',
        action: 'archive'
      });
    }
    
    // Check if product has inventory transactions
    const transactionsCheck = await pool.query(
      'SELECT COUNT(*) FROM inventory_transactions WHERE product_id = $1',
      [id]
    );
    
    if (parseInt(transactionsCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete product with inventory transactions. Archive instead.',
        action: 'archive'
      });
    }
    
    const result = await pool.query(
      'DELETE FROM products WHERE id = $1 RETURNING id',
      [id]
    );
    
    await pool.query(
      `INSERT INTO audit_logs (admin_id, action, entity, entity_id, details)
       VALUES ($1, 'DELETE', 'product', $2, $3::jsonb)`,
      [req.admin.id, id, JSON.stringify({ name: checkResult.rows[0].name, sku: checkResult.rows[0].sku })]
    );
    
    res.json({ 
      message: 'Product deleted successfully',
      product: { name: checkResult.rows[0].name, sku: checkResult.rows[0].sku }
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Stock transaction (in/out)
router.post('/transactions', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { product_id, transaction_type, quantity, notes } = req.body;
    
    await client.query('BEGIN');
    
    const productResult = await client.query(
      'SELECT name, quantity, unit_price FROM products WHERE id = $1 FOR UPDATE',
      [product_id]
    );
    
    if (productResult.rows.length === 0) {
      throw new Error('Product not found');
    }
    
    const product = productResult.rows[0];
    const newQuantity = transaction_type === 'stock_in' 
      ? product.quantity + quantity 
      : product.quantity - quantity;
    
    if (newQuantity < 0) {
      throw new Error('Insufficient stock');
    }
    
    await client.query(
      `UPDATE products 
       SET quantity = $1, updated_at = NOW()
       WHERE id = $2`,
      [newQuantity, product_id]
    );
    
    const result = await client.query(
      `INSERT INTO inventory_transactions (
        product_id, transaction_type, quantity, unit_price, total_amount, notes
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [product_id, transaction_type, quantity, product.unit_price, product.unit_price * quantity, notes]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json({
      transaction: result.rows[0],
      new_quantity: newQuantity
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error recording transaction:', error);
    res.status(500).json({ error: error.message || 'Failed to record transaction' });
  } finally {
    client.release();
  }
});

// Get inventory transactions
router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const { product_id } = req.query;
    let query = `
      SELECT t.*, p.name as product_name
      FROM inventory_transactions t
      JOIN products p ON t.product_id = p.id
    `;
    const params = [];
    
    if (product_id) {
      query += ` WHERE t.product_id = $1`;
      params.push(product_id);
    }
    
    query += ` ORDER BY t.transaction_date DESC LIMIT 100`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get categories
router.get('/categories', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory_categories ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create category
router.post('/categories', authMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;
    const result = await pool.query(
      `INSERT INTO inventory_categories (name, description)
       VALUES ($1, $2)
       RETURNING *`,
      [name, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

module.exports = router;