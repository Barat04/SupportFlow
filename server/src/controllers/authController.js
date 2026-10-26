const authService = require('../services/authService');

/**
 * Handles customer registration.
 * Role is strictly set to customer by the service.
 */
async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const { user, token } = await authService.registerCustomer({ name, email, password });

    res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      token,
      user
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Handles user login for all roles.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.loginUser({ email, password });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Returns current authenticated user profile.
 */
async function getMe(req, res, next) {
  try {
    res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  getMe
};
