const express = require('express');
const cors = require('cors');
const path = require('path');
// Load environment variables from .env into process.env
require('dotenv').config();

const testRoutes = require('./routes/testRoutes');
const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const { testDbConnection } = require('./config/db');


const app = express();
const PORT = process.env.PORT || 5000;

const isLocalOrigin = (origin) =>
  /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);

// Core middleware for JSON parsing and cross-origin requests.
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';

      if (!origin || origin === allowedOrigin || isLocalOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error('CORS policy does not allow this origin.'));
    },
  })
);

// API route groups.
app.use('/api', testRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);

const startServer = async () => {
  try {
    await testDbConnection();
    console.log('MySQL connection established successfully.');

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
