const express = require('express');
   const router = express.Router();
   const { Pool } = require('pg');
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
   });

   // Middleware to verify JWT
   const authMiddleware = (req, res, next) => {
     const token = req.headers.authorization?.split(' ')[1];
     if (!token) return res.status(401).json({ message: 'Unauthorized' });
     // Add your JWT verification logic here
     next();
   };

   // Get all food items
   router.get('/', authMiddleware, async (req, res) => {
     try {
       const result = await pool.query('SELECT * FROM food_items');
       res.json(result.rows);
     } catch (err) {
       console.error(err.stack);
       res.status(500).json({ message: 'Server error' });
     }
   });

   // Create food item
   router.post('/', authMiddleware, async (req, res) => {
     const { name, category, price } = req.body;
     if (!name || !category || !price) {
       return res.status(400).json({ message: 'Name, category, and price are required' });
     }
     try {
       const result = await pool.query(
         'INSERT INTO food_items (name, category, price) VALUES ($1, $2, $3) RETURNING *',
         [name, category, price]
       );
       res.status(201).json(result.rows[0]);
     } catch (err) {
       console.error(err.stack);
       res.status(500).json({ message: 'Server error' });
     }
   });

   // Update food item
   router.put('/:id', authMiddleware, async (req, res) => {
     const { name, category, price } = req.body;
     try {
       const result = await pool.query(
         'UPDATE food_items SET name = $1, category = $2, price = $3 WHERE id = $4 RETURNING *',
         [name, category, price, req.params.id]
       );
       if (result.rows.length === 0) {
         return res.status(404).json({ message: 'Food item not found' });
       }
       res.json(result.rows[0]);
     } catch (err) {
       console.error(err.stack);
       res.status(500).json({ message: 'Server error' });
     }
   });

   // Delete food item
   router.delete('/:id', authMiddleware, async (req, res) => {
     try {
       const result = await pool.query('DELETE FROM food_items WHERE id = $1 RETURNING *', [req.params.id]);
       if (result.rows.length === 0) {
         return res.status(404).json({ message: 'Food item not found' });
       }
       res.json({ message: 'Food item deleted' });
     } catch (err) {
       console.error(err.stack);
       res.status(500).json({ message: 'Server error' });
     }
   });

   module.exports = router;