// const express = require('express');
// const { Pool } = require('pg');
// const authMiddleware = require('../middleware/auth');
// const bcrypt = require('bcryptjs');
// const router = express.Router();

// const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// // Helper to verify admin password
// const verifyAdminPassword = async (password) => {
//   try {
//     const admin = await pool.query('SELECT password FROM users WHERE role = $1', ['admin']);
//     if (admin.rows.length === 0) return false;
//     return await bcrypt.compare(password, admin.rows[0].password);
//   } catch (error) {
//     console.error('Error verifying admin password:', error);
//     return false;
//   }
// };

// // Get all orders with details
// router.get('/', authMiddleware(['admin', 'cashier']), async (req, res) => {
//   try {
//     console.log('Fetching orders...');
//     const ordersResult = await pool.query(
//       `SELECT o.*, l.building_name 
//        FROM orders o 
//        LEFT JOIN locations l ON o.delivery_location_id = l.id 
//        ORDER BY o.created_at DESC`
//     );
//     console.log('Orders fetched:', ordersResult.rows.length);

//     const orders = ordersResult.rows;

//     // Fetch order items for each order
//     for (let order of orders) {
//       console.log(`Fetching items for order ${order.id}...`);
//       const itemsResult = await pool.query(
//         `SELECT oi.*, f.name, f.price 
//          FROM order_items oi 
//          JOIN food_items f ON oi.food_item_id = f.id 
//          WHERE oi.order_id = $1`,
//         [order.id]
//       );
//       console.log(`Items fetched for order ${order.id}:`, itemsResult.rows.length);
//       order.items = itemsResult.rows;
//     }

//     res.json(orders);
//   } catch (error) {
//     console.error('Error fetching orders:', error.message, error.stack);
//     res.status(500).json({ message: 'Server error', details: error.message });
//   }
// });

// // Create order
// router.post('/', authMiddleware(['admin', 'cashier']), async (req, res) => {
//   const { order_type, table_number, delivery_location_id, payment_method, items } = req.body;
//   let total_price = 0;

//   try {
//     // Calculate total price
//     for (const item of items) {
//       const foodItem = await pool.query('SELECT price FROM food_items WHERE id = $1', [item.food_item_id]);
//       if (foodItem.rows.length === 0) return res.status(404).json({ message: 'Food item not found' });
//       total_price += foodItem.rows[0].price * item.quantity;
//     }

//     // Insert order
//     const orderResult = await pool.query(
//       'INSERT INTO orders (order_type, table_number, delivery_location_id, payment_method, total_price) VALUES ($1, $2, $3, $4, $5) RETURNING *',
//       [order_type, table_number || null, delivery_location_id || null, payment_method, total_price]
//     );
//     const order = orderResult.rows[0];

//     // Insert order items
//     for (const item of items) {
//       await pool.query(
//         'INSERT INTO order_items (order_id, food_item_id, quantity) VALUES ($1, $2, $3)',
//         [order.id, item.food_item_id, item.quantity]
//       );
//     }

//     res.status(201).json(order);
//   } catch (error) {
//     console.error('Error creating order:', error.message, error.stack);
//     res.status(500).json({ message: 'Server error', details: error.message });
//   }
// });

// // Delete order
// router.delete('/:id', authMiddleware(['admin', 'cashier']), async (req, res) => {
//   const { id } = req.params;
//   const { adminPassword } = req.body;
//   const userRole = req.user.role;

//   try {
//     // Check if order exists
//     const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
//     if (orderResult.rows.length === 0) return res.status(404).json({ message: 'Order not found' });

//     // Permission check
//     if (userRole === 'cashier') {
//       if (!adminPassword) {
//         return res.status(400).json({ message: 'Admin password required' });
//       }
//       const isPasswordValid = await verifyAdminPassword(adminPassword);
//       if (!isPasswordValid) {
//         return res.status(401).json({ message: 'Invalid admin password' });
//       }
//     }

//     // Delete order items first (due to foreign key constraint)
//     await pool.query('DELETE FROM order_items WHERE order_id = $1', [id]);
//     // Delete the order
//     await pool.query('DELETE FROM orders WHERE id = $1', [id]);

//     res.json({ message: 'Order deleted successfully' });
//   } catch (error) {
//     console.error('Error deleting order:', error.message, error.stack);
//     res.status(500).json({ message: 'Server error', details: error.message });
//   }
// });

// module.exports = router;

const express = require('express');
const router = express.Router();

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Middleware to verify JWT (simplified)
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  // Add your JWT verification logic here
  next();
};

// Create order
router.post('/', authMiddleware, async (req, res) => {
  const { order_type, table_number, delivery_location_id, items, customer_name } = req.body;
  if (!order_type || !items || items.length === 0) {
    return res.status(400).json({ message: 'Order type and items are required' });
  }
  try {
    const total_price = items.reduce((total, item) => {
      return total + (item.quantity * item.price); // Assuming price is fetched elsewhere or passed
    }, 0);
    const orderResult = await pool.query(
      'INSERT INTO orders (order_type, table_number, delivery_location_id, total_price, payment_method, order_status, customer_name) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [order_type, table_number, delivery_location_id, total_price, 'Pending', 'in_process', customer_name]
    );
    const order = orderResult.rows[0];
    for (const item of items) {
      await pool.query(
        'INSERT INTO order_items (order_id, food_item_id, quantity) VALUES ($1, $2, $3)',
        [order.id, item.food_item_id, item.quantity]
      );
    }
    // Fetch order with items for response
    const fullOrder = await pool.query(
      'SELECT o.*, oi.food_item_id, oi.quantity, fi.name, fi.price FROM orders o LEFT JOIN order_items oi ON o.id = oi.order_id LEFT JOIN food_items fi ON oi.food_item_id = fi.id WHERE o.id = $1',
      [order.id]
    );
    const result = fullOrder.rows.reduce((acc, row) => {
      if (!acc.id) {
        acc = { ...row, items: [] };
      }
      if (row.food_item_id) {
        acc.items.push({
          food_item_id: row.food_item_id,
          quantity: row.quantity,
          name: row.name,
          price: row.price
        });
      }
      return acc;
    }, {});
    res.status(201).json(result);
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all orders
router.get('/', authMiddleware, async (req, res) => {
  try {
    const ordersResult = await pool.query(
      'SELECT o.*, l.building_name FROM orders o LEFT JOIN locations l ON o.delivery_location_id = l.id'
    );
    const orders = ordersResult.rows;
    for (let order of orders) {
      const itemsResult = await pool.query(
        'SELECT oi.*, fi.name, fi.price FROM order_items oi JOIN food_items fi ON oi.food_item_id = fi.id WHERE oi.order_id = $1',
        [order.id]
      );
      order.items = itemsResult.rows;
    }
    res.json(orders);
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ message: 'Server error' });
  }
});

// Checkout order
router.post('/:id/checkout', authMiddleware, async (req, res) => {
  const { payment_method } = req.body;
  if (!payment_method) {
    return res.status(400).json({ message: 'Payment method is required' });
  }
  try {
    await pool.query(
      'UPDATE orders SET payment_method = $1, order_status = $2 WHERE id = $3',
      [payment_method, 'completed', req.params.id]
    );
    res.json({ message: 'Order checked out successfully' });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;