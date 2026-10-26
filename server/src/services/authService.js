const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ROLES } = require('../constants/roles');
const { env } = require('../config/env');
const { ConflictError, UnauthorizedError, NotFoundError } = require('../utils/errors');

/**
 * Signs a JWT containing essential user identity and role claims.
 * 
 * @param {Object} user 
 * @returns {string} Signed JWT
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN
    }
  );
}

/**
 * Registers a new customer account.
 * Crucial Security Rule: Always forces role to 'customer' regardless of input.
 * 
 * @param {Object} registrationData 
 * @param {string} registrationData.name
 * @param {string} registrationData.email
 * @param {string} registrationData.password
 * @returns {Promise<{ user: Object, token: string }>}
 */
async function registerCustomer({ name, email, password }) {
  // Check if email already registered (case-insensitive normalized)
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new ConflictError('An account with this email address already exists');
  }

  // Create user with unconditionally forced customer role
  const user = new User({
    name,
    email: email.toLowerCase(),
    password,
    role: ROLES.CUSTOMER // Hardcoded: never accept client-provided role
  });

  await user.save();

  const token = generateToken(user);

  return {
    user,
    token
  };
}

/**
 * Authenticates user credentials and returns an access token.
 * Uses generic error messages to prevent user enumeration attacks.
 * 
 * @param {Object} credentials
 * @param {string} credentials.email
 * @param {string} credentials.password
 * @returns {Promise<{ user: Object, token: string }>}
 */
async function loginUser({ email, password }) {
  // Must explicitly select +password since schema has select: false
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user || !user.isActive) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const token = generateToken(user);

  return {
    user,
    token
  };
}

/**
 * Retrieves the current user's profile by ID.
 * 
 * @param {string} userId 
 * @returns {Promise<Object>}
 */
async function getUserProfile(userId) {
  const user = await User.findById(userId);

  if (!user || !user.isActive) {
    throw new NotFoundError('User account not found or has been deactivated');
  }

  return user;
}

/**
 * Retrieves active staff members (Agents & Admins) for ticket assignment.
 * 
 * @returns {Promise<Array<Object>>}
 */
async function getStaffMembers() {
  return User.find({
    role: { $in: [ROLES.AGENT, ROLES.ADMIN] },
    isActive: true
  }).select('name email role');
}

module.exports = {
  generateToken,
  registerCustomer,
  loginUser,
  getUserProfile,
  getStaffMembers
};
