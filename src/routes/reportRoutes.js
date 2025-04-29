const express = require('express');
const { Pool } = require('pg');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Get overall sales summary
router.get('/sales-summary', authMiddleware(['admin']), async (req, res) => {
  try {
    const totalSales = await pool.query(
      'SELECT SUM(total_price) as total_revenue, COUNT(*) as total_orders FROM orders'
    );
    const avgOrderValue = await pool.query(
      'SELECT AVG(total_price)::float as avg_order_value FROM orders'
    );
    res.json({
      total_revenue: parseInt(totalSales.rows[0].total_revenue) || 0,
      total_orders: parseInt(totalSales.rows[0].total_orders) || 0,
      avg_order_value: parseFloat(avgOrderValue.rows[0].avg_order_value) || 0,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get sales by order type
router.get('/sales-by-type', authMiddleware(['admin']), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT order_type, 
              COUNT(*) as order_count, 
              SUM(total_price) as revenue 
       FROM orders 
       GROUP BY order_type`
    );
    res.json(
      result.rows.map((row) => ({
        ...row,
        order_count: parseInt(row.order_count),
        revenue: parseInt(row.revenue),
      }))
    );
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get top 5 popular food items
router.get('/popular-items', authMiddleware(['admin']), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.name, f.category, SUM(oi.quantity) as total_quantity
       FROM order_items oi
       JOIN food_items f ON oi.food_item_id = f.id
       GROUP BY f.id, f.name, f.category
       ORDER BY total_quantity DESC
       LIMIT 5`
    );
    res.json(
      result.rows.map((row) => ({
        ...row,
        total_quantity: parseInt(row.total_quantity),
      }))
    );
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get daily sales for the past 7 days
router.get('/daily-sales', authMiddleware(['admin']), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DATE(created_at) as sale_date, 
              SUM(total_price) as daily_revenue, 
              COUNT(*) as daily_orders 
       FROM orders 
       WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
       GROUP BY DATE(created_at)
       ORDER BY sale_date`
    );
    res.json(
      result.rows.map((row) => ({
        ...row,
        daily_revenue: parseInt(row.daily_revenue),
        daily_orders: parseInt(row.daily_orders),
      }))
    );
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;