require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const authRoutes = require('./routes/authRoutes');
const foodRoutes = require('./routes/foodRoutes');
const locationRoutes = require('./routes/locationRoutes');
const orderRoutes = require('./routes/orderRoutes');
const reportRoutes = require('./routes/reportRoutes');
const locations= require('./routes/locations')
const foods= require('./routes/foods')

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test database connection
pool.connect((err) => {
  if (err) {
    console.error('Database connection error:', err.stack);
  } else {
    console.log('Connected to PostgreSQL database');
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reports', reportRoutes);

app.use('/api/foods', foods);
app.use('/api/locations', locations);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');
// const { Pool } = require('pg');
// const authRoutes = require('./routes/authRoutes');
// const foodRoutes = require('./routes/foodRoutes');
// const locationRoutes = require('./routes/locationRoutes');
// const orderRoutes = require('./routes/orderRoutes');
// const reportRoutes = require('./routes/reportRoutes');

// const app = express();

// // Middleware
// app.use(cors({
//   origin: [
//     'http://localhost:3000', // Local development
//     'https://tamarmyay.netlify.app/' // Replace with your Netlify domain
//   ],
//   credentials: true
// }));
// app.use(express.json());

// // Database connection
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
// });

// // Test database connection
// pool.connect((err) => {
//   if (err) {
//     console.error('Database connection error:', err.stack);
//   } else {
//     console.log('Connected to PostgreSQL database');
//   }
// });

// // Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/foods', foodRoutes);
// app.use('/api/locations', locationRoutes);
// app.use('/api/orders', orderRoutes);
// app.use('/api/reports', reportRoutes);

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });