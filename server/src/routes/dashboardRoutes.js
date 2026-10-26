const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Dashboard routes require authentication
router.use(authenticate);

// Aggregated live dashboard metrics
router.get('/metrics', dashboardController.getMetrics);

module.exports = router;
