const { ForbiddenError, UnauthorizedError } = require('../utils/errors');

/**
 * Role-Based Access Control (RBAC) middleware factory.
 * Enforces that req.user has one of the required roles.
 * 
 * @param {...string} allowedRoles - List of roles permitted to access the route
 * @returns {Function} Express middleware function
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required before checking permissions'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access denied: Role '${req.user.role}' is not authorized to access this resource`
        )
      );
    }

    next();
  };
}

module.exports = {
  authorizeRoles
};
