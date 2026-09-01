require('dotenv').config();
const { ensureMessagingSchema } = require('../services/messageService');
const { dbPool } = require('../config/db');

const createMessagingTables = async () => {
  try {
    await ensureMessagingSchema();
    console.log('Messaging tables are ready.');
  } catch (error) {
    console.error('Failed to create messaging tables:', error.message);
    process.exit(1);
  } finally {
    await dbPool.end();
  }
};

createMessagingTables();
