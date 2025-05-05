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
const { Pool } = require('pg');
const authMiddleware = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const router = express.Router();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Helper to verify admin password
const verifyAdminPassword = async (password) => {
  try {
    const admin = await pool.query('SELECT password FROM users WHERE role = $1', ['admin']);
    if (admin.rows.length === 0) return false;
    return await bcrypt.compare(password, admin.rows[0].password);
  } catch (error) {
    console.error('Error verifying admin password:', error);
    return false;
  }
};

// Get all orders with details (filter by status for Check Out)
router.get('/', authMiddleware(['admin', 'cashier']), async (req, res) => {
  try {
    console.log('Fetching orders...');
    const statusFilter = req.query.status || 'in_process';
    const ordersResult = await pool.query(
      `SELECT o.*, l.building_name 
       FROM orders o 
       LEFT JOIN locations l ON o.delivery_location_id = l.id 
       WHERE o.order_status = $1
       ORDER BY o.created_at DESC`,
      [statusFilter]
    );
    console.log('Orders fetched:', ordersResult.rows.length);

    const orders = ordersResult.rows;

    // Fetch order items for each order
    for (let order of orders) {
      console.log(`Fetching items for order ${order.id}...`);
      const itemsResult = await pool.query(
        `SELECT oi.*, f.name, f.price 
         FROM order_items oi 
         JOIN food_items f ON oi.food_item_id = f.id 
         WHERE oi.order_id = $1`,
        [order.id]
      );
      console.log(`Items fetched for order ${order.id}:`, itemsResult.rows.length);
      order.items = itemsResult.rows;
    }

    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error.message, error.stack);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
});

// Create order
router.post('/', authMiddleware(['admin', 'cashier']), async (req, res) => {
  const { order_type, table_number, delivery_location_id, payment_method, items } = req.body;
  let total_price = 0;

  try {
    // Calculate total price
    for (const item of items) {
      const foodItem = await pool.query('SELECT price FROM food_items WHERE id = $1', [item.food_item_id]);
      if (foodItem.rows.length === 0) return res.status(404).json({ message: 'Food item not found' });
      total_price += foodItem.rows[0].price * item.quantity;
    }

    // Insert order with status 'in_process'
    const orderResult = await pool.query(
      'INSERT INTO orders (order_type, table_number, delivery_location_id, payment_method, total_price, order_status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [order_type, table_number || null, delivery_location_id || null, payment_method, total_price, 'in_process']
    );
    const order = orderResult.rows[0];

    // Insert order items
    for (const item of items) {
      await pool.query(
        'INSERT INTO order_items (order_id, food_item_id, quantity) VALUES ($1, $2, $3)',
        [order.id, item.food_item_id, item.quantity]
      );
    }

    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error.message, error.stack);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
});

// Checkout order (update status to completed)
router.post('/:id/checkout', authMiddleware(['admin', 'cashier']), async (req, res) => {
  const { id } = req.params;
  const { payment_method } = req.body;

  try {
    const orderResult = await pool.query(
      'UPDATE orders SET order_status = $1, payment_method = $2 WHERE id = $3 RETURNING *',
      ['completed', payment_method, id]
    );
    if (orderResult.rows.length === 0) return res.status(404).json({ message: 'Order not found' });

    res.json(orderResult.rows[0]);
  } catch (error) {
    console.error('Error checking out order:', error.message, error.stack);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
});

// Delete order
router.delete('/:id', authMiddleware(['admin', 'cashier']), async (req, res) => {
  const { id } = req.params;
  const { adminPassword } = req.body;
  const userRole = req.user.role;

  try {
    // Check if order exists
    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (orderResult.rows.length === 0) return res.status(404).json({ message: 'Order not found' });

    // Permission check
    if (userRole === 'cashier') {
      if (!adminPassword) {
        return res.status(400).json({ message: 'Admin password required' });
      }
      const isPasswordValid = await verifyAdminPassword(adminPassword);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid admin password' });
      }
    }

    // Delete order items first (due to foreign key constraint)
    await pool.query('DELETE FROM order_items WHERE order_id = $1', [id]);
    // Delete the order
    await pool.query('DELETE FROM orders WHERE id = $1', [id]);

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error.message, error.stack);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
});

module.exports = router;