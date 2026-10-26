const express = require('express');
const authController = require('../controllers/authController');
const { registerValidation, loginValidation } = require('../validations/authValidation');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', registerValidation, validate, authController.register);
router.post('/login', loginValidation, validate, authController.login);

// Protected routes (requires valid Bearer token)
router.get('/me', authenticate, authController.getMe);

module.exports = router;
