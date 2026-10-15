const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
// Load environment variables from .env into process.env
require('dotenv').config();

const testRoutes = require('./routes/testRoutes');
const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const claimRoutes = require('./routes/claimRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const messageRoutes = require('./routes/messageRoutes');
const { testDbConnection } = require('./config/db');
const { ensureWorkflowSchema, runClaimExpirySweep } = require('./controllers/claimController');
const { ensureItemStatusSchema } = require('./controllers/itemController');
const { ensureNotificationsSchema } = require('./services/notificationService');
const { ensureMessagingSchema } = require('./services/messageService');
const socketAuth = require('./middleware/socketAuth');
const { registerMessageSocketHandlers } = require('./socket/messageSocket');


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
app.use('/api/claims', claimRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);

const startServer = async () => {
  try {
    await testDbConnection();
    await ensureItemStatusSchema();
    await ensureWorkflowSchema();
    await ensureNotificationsSchema();
    await ensureMessagingSchema();
    console.log('MySQL connection established successfully.');

    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: (origin, callback) => {
          const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';

          if (!origin || origin === allowedOrigin || isLocalOrigin(origin)) {
            return callback(null, true);
          }

          return callback(new Error('CORS policy does not allow this origin.'));
        },
        credentials: true,
      },
    });

    io.use(socketAuth);
    registerMessageSocketHandlers(io);
    app.set('io', io);

   server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. The backend may already be running in another terminal.`);
        process.exit(1);
      }

      throw error;
    });

    await runClaimExpirySweep();
    const expirySweep = setInterval(() => {
      runClaimExpirySweep();
    }, 60 * 60 * 1000);
    expirySweep.unref();
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
