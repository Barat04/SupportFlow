const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { env } = require('../config/env');
const { UnauthorizedError } = require('../utils/errors');

/**
 * Middleware that authenticates requests via Bearer JWT in the Authorization header.
 * Attaches the authenticated Mongoose user document to req.user.
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token missing or malformed');
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Session has expired. Please log in again.');
      }
      throw new UnauthorizedError('Invalid authentication token');
    }

    // Verify user still exists and account is active
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      throw new UnauthorizedError('User account not found or deactivated');
    }

    // Attach user to request object for downstream controllers and RBAC guards
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  authenticate
};
