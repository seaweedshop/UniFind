const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');
const { dbPool } = require('../config/db');
const ITEM_CATEGORIES = require('../constants/itemCategories');

const ALLOWED_SORTS = new Set(['newest', 'oldest', 'price_low', 'price_high']);
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 24;

const getUploadedPath = (file) => (file ? `/uploads/${file.filename}` : null);

const getFileSystemPath = (storedPath) => {
  if (!storedPath) {
    return null;
  }

  return path.join(__dirname, '..', storedPath.replace(/^\//, ''));
};

const deleteImageFile = (storedPath) => {
  const imagePath = getFileSystemPath(storedPath);

  if (imagePath && fs.existsSync(imagePath)) {
    fs.unlinkSync(imagePath);
  }
};

const buildFilters = (query) => {
  const clauses = [];
  const values = [];
  const itemType = query.item_type ? String(query.item_type).trim() : '';
  const category = query.category ? String(query.category).trim() : '';
  const search = query.search ? String(query.search).trim() : '';
  const sort = query.sort ? String(query.sort).trim() : 'newest';
  const page = query.page ? Number.parseInt(query.page, 10) : 1;
  const limit = query.limit ? Number.parseInt(query.limit, 10) : DEFAULT_LIMIT;

  if (itemType && !['lost', 'found', 'sell'].includes(itemType)) {
    const error = new Error('Item type must be lost, found, or sell.');
    error.statusCode = 400;
    throw error;
  }

  if (category && !ITEM_CATEGORIES.includes(category)) {
    const error = new Error('Category must be one of the supported item categories.');
    error.statusCode = 400;
    throw error;
  }

  if (!ALLOWED_SORTS.has(sort)) {
    const error = new Error('Sort must be newest, oldest, price_low, or price_high.');
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isInteger(page) || page < 1) {
    const error = new Error('Page must be a positive integer.');
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    const error = new Error(`Limit must be a positive integer up to ${MAX_LIMIT}.`);
    error.statusCode = 400;
    throw error;
  }

  if (itemType) {
    clauses.push('item_type = ?');
    values.push(itemType);
  }

  if (category) {
    clauses.push('category = ?');
    values.push(category);
  }

  if (search) {
    // Search is title-only and case-insensitive so the browse API stays predictable.
    clauses.push('LOWER(title) LIKE ?');
    values.push(`%${search.toLowerCase()}%`);
  }

  if (query.user_id) {
    clauses.push('user_id = ?');
    values.push(query.user_id);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  let orderClause = 'ORDER BY created_at DESC, id DESC';

  if (sort === 'oldest') {
    orderClause = 'ORDER BY created_at ASC, id ASC';
  }

  if (sort === 'price_low') {
    orderClause = 'ORDER BY CASE WHEN price IS NULL THEN 1 ELSE 0 END, price ASC, created_at DESC, id DESC';
  }

  if (sort === 'price_high') {
    orderClause = 'ORDER BY CASE WHEN price IS NULL THEN 1 ELSE 0 END, price DESC, created_at DESC, id DESC';
  }

  return {
    whereClause,
    values,
    orderClause,
    page,
    limit,
  };
};

const normalizeItem = (row) => ({
  ...row,
  price: row.price !== null ? Number(row.price) : null,
  image_url: row.image || null,
  status_label:
    row.item_type === 'sell'
      ? row.resolved
        ? 'Sold'
        : 'Active'
      : row.resolved
        ? 'Resolved'
        : 'Active',
});

const fetchItemById = async (id) => {
  const [rows] = await dbPool.execute('SELECT * FROM items WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
};

const assertOwnership = (item, userId) => {
  if (!item) {
    const error = new Error('Item not found.');
    error.statusCode = 404;
    throw error;
  }

  if (item.user_id !== userId) {
    const error = new Error('You can only manage your own listings.');
    error.statusCode = 403;
    throw error;
  }
};

const createItem = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    deleteImageFile(getUploadedPath(req.file));

    return res.status(400).json({
      message: 'Please fix the highlighted item fields.',
      errors: errors.array(),
    });
  }

  const { title, description, category, item_type, location, date, price, condition_status } = req.body;
  const image = getUploadedPath(req.file);

  if ((item_type === 'sell' || price || condition_status) && item_type !== 'sell') {
    return res.status(400).json({
      message: 'Price and condition status are only allowed for marketplace items.',
    });
  }

  const [result] = await dbPool.execute(
    `
      INSERT INTO items
        (title, description, category, item_type, image, location, date, price, condition_status, resolved, user_id)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, ?)
    `,
    [
      title.trim(),
      description.trim(),
      category.trim(),
      item_type,
      image,
      location.trim(),
      date,
      item_type === 'sell' && price ? Number(price) : null,
      item_type === 'sell' ? (condition_status || null) : null,
      req.user.id,
    ]
  );

  const [rows] = await dbPool.execute('SELECT * FROM items WHERE id = ?', [result.insertId]);

  return res.status(201).json({
    message: 'Item created successfully.',
    item: normalizeItem(rows[0]),
  });
};

const getAllItems = async (req, res) => {
  let filters;

  try {
    filters = buildFilters(req.query);
  } catch (error) {
    return res.status(error.statusCode || 400).json({ message: error.message });
  }

  const { whereClause, values, orderClause, page, limit } = filters;

  const [countRows] = await dbPool.execute(
    `
      SELECT COUNT(*) AS totalCount
      FROM items
      ${whereClause}
    `,
    values
  );

  const totalItems = Number(countRows[0]?.totalCount || 0);
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 0;
  const currentPage = totalPages > 0 ? Math.min(page, totalPages) : 1;
  const offset = (currentPage - 1) * limit;

  const [rows] = await dbPool.execute(
    `
      SELECT *
      FROM items
      ${whereClause}
      ${orderClause}
      LIMIT ? OFFSET ?
    `,
    [...values, limit, offset]
  );

  return res.status(200).json({
    message: 'Items fetched successfully.',
    items: rows.map(normalizeItem),
    currentPage,
    totalPages,
    totalItems,
    limit,
  });
};

const getSingleItem = async (req, res) => {
  const item = await fetchItemById(req.params.id);

  if (!item) {
    return res.status(404).json({ message: 'Item not found.' });
  }

  return res.status(200).json({
    message: 'Item fetched successfully.',
    item: normalizeItem(item),
  });
};

const getUserListings = async (req, res) => {
  const [rows] = await dbPool.execute(
    'SELECT * FROM items WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.id]
  );

  const items = rows.map(normalizeItem);

  return res.status(200).json({
    message: 'Your listings fetched successfully.',
    listings: {
      lost: items.filter((item) => item.item_type === 'lost'),
      found: items.filter((item) => item.item_type === 'found'),
      sell: items.filter((item) => item.item_type === 'sell'),
    },
  });
};

const updateItem = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    deleteImageFile(getUploadedPath(req.file));

    return res.status(400).json({
      message: 'Please fix the highlighted item fields.',
      errors: errors.array(),
    });
  }

  const existingItem = await fetchItemById(req.params.id);

  try {
    assertOwnership(existingItem, req.user.id);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }

  const image = req.file ? getUploadedPath(req.file) : existingItem.image;

  if (req.file) {
    deleteImageFile(existingItem.image);
  }

  const itemType = req.body.item_type || existingItem.item_type;
  const resolvedValue = typeof req.body.resolved !== 'undefined'
    ? req.body.resolved === true || req.body.resolved === 'true' || req.body.resolved === '1'
    : existingItem.resolved;

  const priceValue = itemType === 'sell'
    ? (req.body.price !== undefined && req.body.price !== '' ? Number(req.body.price) : existingItem.price)
    : null;

  const conditionValue = itemType === 'sell'
    ? (req.body.condition_status !== undefined ? req.body.condition_status : existingItem.condition_status)
    : null;

  await dbPool.execute(
    `
      UPDATE items
      SET title = ?, description = ?, category = ?, item_type = ?, image = ?, location = ?, date = ?, price = ?, condition_status = ?, resolved = ?
      WHERE id = ?
    `,
    [
      req.body.title ? req.body.title.trim() : existingItem.title,
      req.body.description ? req.body.description.trim() : existingItem.description,
      req.body.category ? req.body.category.trim() : existingItem.category,
      itemType,
      image,
      req.body.location ? req.body.location.trim() : existingItem.location,
      req.body.date || existingItem.date,
      priceValue,
      conditionValue,
      resolvedValue,
      existingItem.id,
    ]
  );

  const updatedRows = await fetchItemById(existingItem.id);

  return res.status(200).json({
    message: 'Item updated successfully.',
    item: normalizeItem(updatedRows),
  });
};

const updateItemStatus = async (req, res) => {
  const item = await fetchItemById(req.params.id);

  try {
    assertOwnership(item, req.user.id);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }

  const resolved = req.body.resolved === true || req.body.resolved === 'true' || req.body.resolved === '1';

  await dbPool.execute('UPDATE items SET resolved = ? WHERE id = ?', [resolved, item.id]);

  const updatedItem = await fetchItemById(item.id);

  return res.status(200).json({
    message: resolved
      ? item.item_type === 'sell'
        ? 'Listing marked as sold.'
        : 'Listing marked as resolved.'
      : 'Listing marked as active.',
    item: normalizeItem(updatedItem),
  });
};

const deleteItem = async (req, res) => {
  const existingItem = await fetchItemById(req.params.id);

  try {
    assertOwnership(existingItem, req.user.id);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }

  deleteImageFile(existingItem.image);

  await dbPool.execute('DELETE FROM items WHERE id = ?', [existingItem.id]);

  return res.status(200).json({ message: 'Item deleted successfully.' });
};

const getMyItems = async (req, res) => {
  const [rows] = await dbPool.execute('SELECT * FROM items WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);

  return res.status(200).json({
    message: 'Your items fetched successfully.',
    items: rows.map(normalizeItem),
  });
};

module.exports = {
  createItem,
  getAllItems,
  getSingleItem,
  updateItem,
  updateItemStatus,
  deleteItem,
  getMyItems,
  getUserListings,
};
