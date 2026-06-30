const express = require('express');
const { body } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const { singleImageUpload } = require('../middleware/uploadMiddleware');
const ITEM_CATEGORIES = require('../constants/itemCategories');
const {
  createItem,
  getAllItems,
  getSingleItem,
  updateItem,
  updateItemStatus,
  deleteItem,
  getMyItems,
  getUserListings,
} = require('../controllers/itemController');

const router = express.Router();

const itemValidation = [
  body('title').trim().notEmpty().withMessage('Title is required.'),
  body('description').trim().notEmpty().withMessage('Description is required.'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required.')
    .isIn(ITEM_CATEGORIES)
    .withMessage('Category must be one of the supported item categories.'),
  body('item_type')
    .isIn(['lost', 'found', 'sell'])
    .withMessage('Item type must be lost, found, or sell.'),
  body('location').trim().notEmpty().withMessage('Location is required.'),
  body('date').isISO8601().withMessage('Date must be a valid date.'),
  body('price')
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Price must be a valid non-negative number.'),
  body('condition_status').optional().trim(),
];

const updateValidation = [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty.'),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty.'),
  body('category')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Category cannot be empty.')
    .isIn(ITEM_CATEGORIES)
    .withMessage('Category must be one of the supported item categories.'),
  body('item_type')
    .optional()
    .isIn(['lost', 'found', 'sell'])
    .withMessage('Item type must be lost, found, or sell.'),
  body('location').optional().trim().notEmpty().withMessage('Location cannot be empty.'),
  body('date').optional().isISO8601().withMessage('Date must be valid.'),
  body('price')
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Price must be a valid non-negative number.'),
  body('condition_status').optional().trim(),
  body('resolved').optional().isBoolean().withMessage('Resolved must be true or false.'),
];

router.get('/', getAllItems);
router.get('/user/listings', authMiddleware, getUserListings);
router.get('/me', authMiddleware, getMyItems);
router.get('/:id', getSingleItem);
router.post('/', authMiddleware, singleImageUpload, itemValidation, createItem);
router.put('/:id', authMiddleware, singleImageUpload, updateValidation, updateItem);
router.put('/:id/status', authMiddleware, updateItemStatus);
router.delete('/:id', authMiddleware, deleteItem);

module.exports = router;
