const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');
const { dbPool } = require('../config/db');
const {
  uploadImageBuffer,
  deleteCloudinaryImage,
} = require('../config/cloudinary');
const ITEM_CATEGORIES = require('../constants/itemCategories');
const {
  ITEM_STATUSES,
  getItemStatusRank,
  normalizeItemStatus,
  getClaimSummaryForItem,
  resolveItemForOwner,
} = require('./claimController');

const ALLOWED_SORTS = new Set(['newest', 'oldest', 'price_low', 'price_high']);
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 24;

const ensureItemStatusSchema = async () => {
  const [rows] = await dbPool.execute(
    `
      SELECT COUNT(*) AS count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'items'
        AND COLUMN_NAME = 'item_status'
    `,
    [process.env.DB_NAME]
  );

  if (!Number(rows[0]?.count || 0)) {
    await dbPool.execute(
      `
        ALTER TABLE items
        ADD COLUMN item_status ENUM('Active', 'Under Claim Review', 'Resolved') NOT NULL DEFAULT 'Active' AFTER item_type
      `
    );
  }

  await dbPool.execute(
    `
      UPDATE items
      SET item_status = CASE
        WHEN item_status = 'Under Claim Review' THEN 'Under Claim Review'
        WHEN resolved = TRUE OR item_status = 'Resolved' THEN 'Resolved'
        ELSE 'Active'
      END
    `
  );
};

const getItemStatusLabel = (itemStatus) => {
  if (itemStatus === ITEM_STATUSES.UNDER_REVIEW) {
    return 'Accepted Claim In Progress';
  }

  return itemStatus || ITEM_STATUSES.ACTIVE;
};

const isLegacyImagePath = (storedPath) => typeof storedPath === 'string' && storedPath.startsWith('/uploads/');

const getFileSystemPath = (storedPath) => {
  if (!isLegacyImagePath(storedPath)) {
    return null;
  }

  const uploadRoot = path.resolve(__dirname, '..', 'uploads');
  const imagePath = path.resolve(uploadRoot, storedPath.slice('/uploads/'.length));

  return imagePath.startsWith(`${uploadRoot}${path.sep}`) ? imagePath : null;
};

const deleteLegacyImageFile = (storedPath) => {
  const imagePath = getFileSystemPath(storedPath);

  if (imagePath && fs.existsSync(imagePath)) {
    fs.unlinkSync(imagePath);
  }
};

const cleanupStoredImage = async (image, imagePublicId) => {
  if (imagePublicId) {
    try {
      await deleteCloudinaryImage(imagePublicId);
    } catch (error) {
      console.error('Cloudinary image cleanup failed:', error.message);
    }
    return;
  }

  try {
    deleteLegacyImageFile(image);
  } catch (error) {
    console.error('Legacy image cleanup failed:', error.message);
  }
};

const uploadItemImage = async (file) => {
  if (!file) {
    return { image: null, imagePublicId: null };
  }

  const upload = await uploadImageBuffer(file.buffer, file.originalname);

  return {
    image: upload.secureUrl,
    imagePublicId: upload.publicId,
  };
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
  const statusOrder = "CASE WHEN item_status = 'Resolved' THEN 2 WHEN item_status = 'Under Claim Review' THEN 1 ELSE 0 END";
  let orderClause = `ORDER BY ${statusOrder} ASC, created_at DESC, id DESC`;

  if (sort === 'oldest') {
    orderClause = `ORDER BY ${statusOrder} ASC, created_at ASC, id ASC`;
  }

  if (sort === 'price_low') {
    orderClause = `ORDER BY ${statusOrder} ASC, CASE WHEN price IS NULL THEN 1 ELSE 0 END, price ASC, created_at DESC, id DESC`;
  }

  if (sort === 'price_high') {
    orderClause = `ORDER BY ${statusOrder} ASC, CASE WHEN price IS NULL THEN 1 ELSE 0 END, price DESC, created_at DESC, id DESC`;
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
  image_public_id: row.image_public_id || null,
  item_status:
    row.item_status === ITEM_STATUSES.UNDER_REVIEW
      ? ITEM_STATUSES.UNDER_REVIEW
      : Boolean(row.resolved) || row.item_status === ITEM_STATUSES.RESOLVED
        ? ITEM_STATUSES.RESOLVED
        : ITEM_STATUSES.ACTIVE,
  resolved: Boolean(row.resolved) || row.item_status === ITEM_STATUSES.RESOLVED,
  status_label: getItemStatusLabel(
    row.item_status === ITEM_STATUSES.UNDER_REVIEW
      ? ITEM_STATUSES.UNDER_REVIEW
      : Boolean(row.resolved) || row.item_status === ITEM_STATUSES.RESOLVED
        ? ITEM_STATUSES.RESOLVED
        : ITEM_STATUSES.ACTIVE
  ),
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
    return res.status(400).json({
      message: 'Please fix the highlighted item fields.',
      errors: errors.array(),
    });
  }

  const { title, description, category, item_type, location, date, price, condition_status } = req.body;

  if ((item_type === 'sell' || price || condition_status) && item_type !== 'sell') {
    return res.status(400).json({
      message: 'Price and condition status are only allowed for marketplace items.',
    });
  }

  let uploadedImage = { image: null, imagePublicId: null };

  try {
    uploadedImage = await uploadItemImage(req.file);

    const [result] = await dbPool.execute(
      `
        INSERT INTO items
          (title, description, category, item_type, image, image_public_id, location, date, price, condition_status, item_status, resolved, user_id)
        VALUES
          (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', FALSE, ?)
      `,
      [
        title.trim(),
        description.trim(),
        category.trim(),
        item_type,
        uploadedImage.image,
        uploadedImage.imagePublicId,
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
  } catch (error) {
    if (uploadedImage.imagePublicId) {
      await cleanupStoredImage(null, uploadedImage.imagePublicId);
    }

    return res.status(error.statusCode || 500).json({
      message: error.message || 'Could not create the item right now.',
    });
  }
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
      LIMIT ${limit} OFFSET ${offset}
    `,
    values
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

  const claimSummary = await getClaimSummaryForItem(item.id);

  return res.status(200).json({
    message: 'Item fetched successfully.',
    item: normalizeItem(item),
    claim_summary: claimSummary,
  });
};

const getUserListings = async (req, res) => {
  const [rows] = await dbPool.execute(
    `
      SELECT *
      FROM items
      WHERE user_id = ?
      ORDER BY CASE WHEN item_status = 'Resolved' THEN 2 WHEN item_status = 'Under Claim Review' THEN 1 ELSE 0 END ASC, created_at DESC
    `,
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

  const itemType = req.body.item_type || existingItem.item_type;
  const resolvedValue = typeof req.body.resolved !== 'undefined'
    ? req.body.resolved === true || req.body.resolved === 'true' || req.body.resolved === '1'
    : existingItem.resolved;

  const nextStatus = req.body.item_status
    ? normalizeItemStatus(req.body.item_status, resolvedValue)
    : resolvedValue
      ? ITEM_STATUSES.RESOLVED
      : normalizeItemStatus(existingItem.item_status, existingItem.resolved);

  const priceValue = itemType === 'sell'
    ? (req.body.price !== undefined && req.body.price !== '' ? Number(req.body.price) : existingItem.price)
    : null;

  const conditionValue = itemType === 'sell'
    ? (req.body.condition_status !== undefined ? req.body.condition_status : existingItem.condition_status)
    : null;

  let uploadedImage = null;

  try {
    if (req.file) {
      uploadedImage = await uploadItemImage(req.file);
    }

    const nextImage = uploadedImage ? uploadedImage.image : existingItem.image;
    const nextImagePublicId = uploadedImage ? uploadedImage.imagePublicId : (existingItem.image_public_id || null);

    await dbPool.execute(
      `
        UPDATE items
        SET title = ?, description = ?, category = ?, item_type = ?, image = ?, image_public_id = ?, location = ?, date = ?, price = ?, condition_status = ?, item_status = ?, resolved = ?
        WHERE id = ?
      `,
      [
        req.body.title ? req.body.title.trim() : existingItem.title,
        req.body.description ? req.body.description.trim() : existingItem.description,
        req.body.category ? req.body.category.trim() : existingItem.category,
        itemType,
        nextImage,
        nextImagePublicId,
        req.body.location ? req.body.location.trim() : existingItem.location,
        req.body.date || existingItem.date,
        priceValue,
        conditionValue,
        nextStatus,
        resolvedValue,
        existingItem.id,
      ]
    );

    if (uploadedImage) {
      await cleanupStoredImage(existingItem.image, existingItem.image_public_id);
    }

    const updatedRows = await fetchItemById(existingItem.id);

    return res.status(200).json({
      message: 'Item updated successfully.',
      item: normalizeItem(updatedRows),
    });
  } catch (error) {
    if (uploadedImage?.imagePublicId) {
      await cleanupStoredImage(null, uploadedImage.imagePublicId);
    }

    return res.status(error.statusCode || 500).json({
      message: error.message || 'Could not update the item right now.',
    });
  }
};

const updateItemStatus = async (req, res) => {
  return resolveItemForOwner(req, res);
};

const deleteItem = async (req, res) => {
  const existingItem = await fetchItemById(req.params.id);

  try {
    assertOwnership(existingItem, req.user.id);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }

  await dbPool.execute('DELETE FROM items WHERE id = ?', [existingItem.id]);
  await cleanupStoredImage(existingItem.image, existingItem.image_public_id);

  return res.status(200).json({ message: 'Item deleted successfully.' });
};

const getMyItems = async (req, res) => {
  const [rows] = await dbPool.execute(
    `
      SELECT *
      FROM items
      WHERE user_id = ?
      ORDER BY CASE WHEN item_status = 'Resolved' THEN 2 WHEN item_status = 'Under Claim Review' THEN 1 ELSE 0 END ASC, created_at DESC
    `,
    [req.user.id]
  );

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
  ensureItemStatusSchema,
};
