const mysql = require('mysql2/promise');

const dbPool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test DB connectivity during server startup.
const testDbConnection = async () => {
  console.log('DB host:', process.env.DB_HOST);
  console.log('DB port:', process.env.DB_PORT);
  console.log('DB name:', process.env.DB_NAME);

  const connection = await dbPool.getConnection();
  try {
    await connection.ping();
    console.log('MySQL ping successful');
  } finally {
    connection.release();
  }
};

module.exports = {
  dbPool,
  testDbConnection,
};
