const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth.middleware');

// Create a new sale
router.post('/', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      customer_id,
      items,
      payment_method,
      notes
    } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }
    
    await client.query('BEGIN');
    
    // Calculate totals
    let subtotal = 0;
    let totalProfit = 0;
    const saleItems = [];
    
    for (const item of items) {
      // Get product details
      const productResult = await client.query(
        'SELECT name, unit_price, cost_price, quantity FROM products WHERE id = $1 FOR UPDATE',
        [item.product_id]
      );
      
      if (productResult.rows.length === 0) {
        throw new Error(`Product not found`);
      }
      
      const product = productResult.rows[0];
      
      if (parseInt(product.quantity) < parseInt(item.quantity)) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.quantity}`);
      }
      
      const unitPrice = parseFloat(item.unit_price) || parseFloat(product.unit_price);
      const quantity = parseInt(item.quantity);
      const totalPrice = unitPrice * quantity;
      const costPrice = parseFloat(product.cost_price) || 0;
      const profit = (unitPrice - costPrice) * quantity;
      
      subtotal += totalPrice;
      totalProfit += profit;
      
      saleItems.push({
        product_id: item.product_id,
        product_name: product.name,
        quantity: quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        cost_price: costPrice,
        profit: profit
      });
    }
    
    // Create sale - handle null customer_id properly
    const saleResult = await client.query(
      `INSERT INTO sales (
        customer_id, subtotal, tax, discount, total_amount,
        payment_method, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        customer_id || null, 
        subtotal, 
        0, 
        0, 
        subtotal, 
        payment_method || 'cash', 
        notes || null, 
        req.admin.id
      ]
    );
    
    const sale = saleResult.rows[0];
    
    // Create sale items and update inventory
    for (const item of saleItems) {
      // Insert sale item
      await client.query(
        `INSERT INTO sale_items (
          sale_id, product_id, quantity, unit_price,
          total_price, cost_price, profit
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [sale.id, item.product_id, item.quantity, item.unit_price, item.total_price, item.cost_price, item.profit]
      );
      
      // Update product quantity
      await client.query(
        `UPDATE products 
         SET quantity = quantity - $1, updated_at = NOW()
         WHERE id = $2`,
        [item.quantity, item.product_id]
      );
      
      // Record inventory transaction
      await client.query(
        `INSERT INTO inventory_transactions (
          product_id, transaction_type, quantity, unit_price, total_amount, notes
        ) VALUES ($1, 'stock_out', $2, $3, $4, $5)`,
        [item.product_id, item.quantity, item.unit_price, item.total_price, `Sale #${sale.sale_number}`]
      );
      
      // Record financial transaction
      await client.query(
        `INSERT INTO financial_transactions (
          transaction_date, type, category, amount, description, reference_id, reference_type
        ) VALUES (NOW(), 'income', 'sales', $1, $2, $3, 'sale')`,
        [item.total_price, `Product sale: ${item.product_name}`, sale.id]
      );
    }
    
    // Log to audit
    await client.query(
      `INSERT INTO audit_logs (admin_id, action, entity, entity_id, details)
       VALUES ($1, 'CREATE', 'sale', $2, $3::jsonb)`,
      [
        req.admin.id, 
        sale.id, 
        JSON.stringify({
          sale_number: sale.sale_number,
          total: sale.total_amount,
          items: saleItems.map(i => ({ name: i.product_name, qty: i.quantity, price: i.unit_price }))
        })
      ]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json({
      sale: sale,
      items: saleItems,
      total_profit: totalProfit
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating sale:', error);
    res.status(500).json({ error: error.message || 'Failed to create sale' });
  } finally {
    client.release();
  }
});

// Get all sales
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let query = `
      SELECT s.*, 
        c.name as customer_name,
        COUNT(si.id) as item_count,
        COALESCE(SUM(si.profit), 0) as total_profit
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN sale_items si ON s.id = si.sale_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;
    
    if (start_date) {
      query += ` AND s.sale_date >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }
    
    if (end_date) {
      query += ` AND s.sale_date <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }
    
    query += ` GROUP BY s.id, c.name ORDER BY s.sale_date DESC LIMIT 50`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

// Get single sale with items
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const saleResult = await pool.query(`
      SELECT s.*, c.name as customer_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.id = $1
    `, [id]);
    
    if (saleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    const itemsResult = await pool.query(`
      SELECT si.*, p.name as product_name, p.sku
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = $1
    `, [id]);
    
    res.json({
      ...saleResult.rows[0],
      items: itemsResult.rows
    });
  } catch (error) {
    console.error('Error fetching sale:', error);
    res.status(500).json({ error: 'Failed to fetch sale' });
  }
});

// Get sales summary for dashboard
router.get('/summary/dashboard', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(si.profit), 0) as total_profit,
        COUNT(DISTINCT customer_id) as unique_customers,
        COUNT(CASE WHEN sale_date >= NOW() - INTERVAL '7 days' THEN 1 END) as weekly_sales,
        COUNT(CASE WHEN sale_date >= DATE_TRUNC('month', NOW()) THEN 1 END) as monthly_sales
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching sales summary:', error);
    res.status(500).json({ error: 'Failed to fetch sales summary' });
  }
});

module.exports = router;