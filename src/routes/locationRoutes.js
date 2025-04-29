const express = require('express');
const { Pool } = require('pg');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Get all locations
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM locations');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Search locations
router.get('/search', async (req, res) => {
  const { q } = req.query;
  try {
    const result = await pool.query(
      'SELECT * FROM locations WHERE building_name ILIKE $1',
      [`%${q}%`]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create location (admin only)
router.post('/', authMiddleware(['admin']), async (req, res) => {
  const { building_name } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO locations (building_name) VALUES ($1) RETURNING *',
      [building_name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update location (admin only)
router.put('/:id', authMiddleware(['admin']), async (req, res) => {
  const { id } = req.params;
  const { building_name } = req.body;
  try {
    const result = await pool.query(
      'UPDATE locations SET building_name = $1 WHERE id = $2 RETURNING *',
      [building_name, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Location not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete location (admin only)
router.delete('/:id', authMiddleware(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM locations WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Location not found' });
    res.json({ message: 'Location deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;