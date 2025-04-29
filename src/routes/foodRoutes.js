const express = require('express');
const { Pool } = require('pg');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Get all food items (accessible to both admin and cashier)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM food_items');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create food item (admin only)
router.post('/', authMiddleware(['admin']), async (req, res) => {
  const { name, category, price } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO food_items (name, category, price) VALUES ($1, $2, $3) RETURNING *',
      [name, category, price]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update food item (admin only)
router.put('/:id', authMiddleware(['admin']), async (req, res) => {
  const { id } = req.params;
  const { name, category, price } = req.body;
  try {
    const result = await pool.query(
      'UPDATE food_items SET name = $1, category = $2, price = $3 WHERE id = $4 RETURNING *',
      [name, category, price, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Food item not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete food item (admin only)
router.delete('/:id', authMiddleware(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM food_items WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Food item not found' });
    res.json({ message: 'Food item deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;