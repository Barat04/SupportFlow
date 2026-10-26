const dashboardService = require('../services/dashboardService');

/**
 * Retrieves role-tailored dashboard metrics and aggregation statistics.
 */
async function getMetrics(req, res, next) {
  try {
    const metrics = await dashboardService.getDashboardMetrics(req.user);

    res.status(200).json({
      success: true,
      metrics
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMetrics
};
