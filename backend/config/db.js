const mysql = require('mysql2/promise');

const dbPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test DB connectivity during server startup.
const testDbConnection = async () => {
  const connection = await dbPool.getConnection();
  await connection.ping();
  connection.release();
};

module.exports = {
  dbPool,
  testDbConnection,
};
