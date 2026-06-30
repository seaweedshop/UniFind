const express = require('express');
const { body } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const {
  registerUser,
  loginUser,
  getCurrentUser,
} = require('../controllers/authController');

const router = express.Router();

const getAllowedDomainMessage = () =>
  `Use your college email address ending with @${process.env.COLLEGE_EMAIL_DOMAIN || 'college.edu'}.`;

const registerValidation = [
  body('full_name').trim().notEmpty().withMessage('Full name is required.'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('Enter a valid email address.'),
  body('email')
    .custom((value) => {
      const domain = (process.env.COLLEGE_EMAIL_DOMAIN || 'college.edu').toLowerCase();
      return String(value).toLowerCase().endsWith(`@${domain}`);
    })
    .withMessage(getAllowedDomainMessage),
  body('department').trim().notEmpty().withMessage('Department is required.'),
  body('year').trim().notEmpty().withMessage('Year is required.'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long.'),
];

const loginValidation = [
  body('email').trim().notEmpty().withMessage('Email is required.').isEmail().withMessage('Enter a valid email address.'),
  body('password').notEmpty().withMessage('Password is required.'),
];

router.post('/register', registerValidation, registerUser);
router.post('/login', loginValidation, loginUser);
router.get('/me', authMiddleware, getCurrentUser);

module.exports = router;
