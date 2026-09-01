const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const {
  createUser,
  findUserByEmail,
} = require('../models/userModel');
const { createNotification } = require('../services/notificationService');

const getAllowedEmailDomain = () => {
  return (process.env.COLLEGE_EMAIL_DOMAIN || 'college.edu').toLowerCase();
};

const isCollegeEmail = (email) => {
  const domain = getAllowedEmailDomain();
  return email.toLowerCase().endsWith(`@${domain}`);
};

const buildToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

const sendAuthSuccess = (res, user, statusCode) => {
  const token = buildToken(user.id);

  return res.status(statusCode).json({
    message: statusCode === 201 ? 'Registration successful.' : 'Login successful.',
    token,
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      department: user.department,
      year: user.year,
      created_at: user.created_at,
    },
  });
};

const registerUser = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Please fix the highlighted registration fields.',
      errors: errors.array(),
    });
  }

  const { full_name, email, department, year, password } = req.body;
  const normalizedEmail = String(email).trim().toLowerCase();

  if (!isCollegeEmail(normalizedEmail)) {
    return res.status(400).json({
      message: `Please use your college email address ending with @${getAllowedEmailDomain()}.`,
    });
  }

  const existingUser = await findUserByEmail(normalizedEmail);

  if (existingUser) {
    return res.status(409).json({
      message: 'This email is already registered. Please login instead or use a different email address.',
    });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const userId = await createUser({
    fullName: full_name.trim(),
    email: normalizedEmail,
    department: department.trim(),
    year: year.trim(),
    password: hashedPassword,
  });

  const user = {
    id: userId,
    full_name: full_name.trim(),
    email: normalizedEmail,
    department: department.trim(),
    year: year.trim(),
    created_at: new Date().toISOString(),
  };

  // Registration notifications are fire-and-forget so account creation stays fast.
  void createNotification(
    user.id,
    'Welcome to Lost & Found',
    'Your account registration was successful.',
    'system'
  ).catch((error) => {
    console.error('Failed to create registration notification:', error.message);
  });

  return sendAuthSuccess(res, user, 201);
};

const loginUser = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Please fix the highlighted login fields.',
      errors: errors.array(),
    });
  }

  const { email, password } = req.body;
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    return res.status(404).json({ message: 'No account found with this email address.' });
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    return res.status(401).json({ message: 'Incorrect password. Please try again.' });
  }

  return sendAuthSuccess(res, user, 200);
};

const getCurrentUser = async (req, res) => {
  return res.status(200).json({
    message: 'Authenticated user fetched successfully.',
    user: req.user,
  });
};

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
};
