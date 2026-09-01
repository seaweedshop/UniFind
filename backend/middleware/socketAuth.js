const jwt = require('jsonwebtoken');
const { findUserById } = require('../models/userModel');

const extractToken = (socket) => {
  const authToken = socket.handshake?.auth?.token;

  if (authToken && typeof authToken === 'string') {
    return authToken.startsWith('Bearer ') ? authToken.slice(7) : authToken;
  }

  const headerValue = socket.handshake?.headers?.authorization;

  if (headerValue && typeof headerValue === 'string' && headerValue.startsWith('Bearer ')) {
    return headerValue.slice(7);
  }

  return '';
};

const socketAuth = async (socket, next) => {
  const token = extractToken(socket);

  if (!token) {
    return next(new Error('Unauthorized'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await findUserById(decoded.id);

    if (!user) {
      return next(new Error('Unauthorized'));
    }

    socket.user = user;
    return next();
  } catch {
    return next(new Error('Unauthorized'));
  }
};

module.exports = socketAuth;
