const { validationResult } = require('express-validator');

/**
 * Express middleware that intercepts requests and evaluates express-validator validation chains.
 * If validation fails, returns a standardized 400 Bad Request error response with field-level details.
 */
function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors
    });
  }

  next();
}

module.exports = validate;
