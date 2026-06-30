const { dbPool } = require('../config/db');

const findUserByEmail = async (email) => {
  const [rows] = await dbPool.execute(
    'SELECT id, full_name, email, department, year, password, created_at FROM users WHERE email = ? LIMIT 1',
    [email]
  );

  return rows[0] || null;
};

const findUserById = async (id) => {
  const [rows] = await dbPool.execute(
    'SELECT id, full_name, email, department, year, created_at FROM users WHERE id = ? LIMIT 1',
    [id]
  );

  return rows[0] || null;
};

const createUser = async ({ fullName, email, department, year, password }) => {
  const [result] = await dbPool.execute(
    'INSERT INTO users (full_name, email, department, year, password) VALUES (?, ?, ?, ?, ?)',
    [fullName, email, department, year, password]
  );

  return result.insertId;
};

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
};
