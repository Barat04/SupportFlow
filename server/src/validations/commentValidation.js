const { body, param } = require('express-validator');
const mongoose = require('mongoose');

const createCommentValidation = [
  param('id')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid ticket ID format'),

  body('message')
    .trim()
    .notEmpty()
    .withMessage('Comment message is required')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message must be between 1 and 2000 characters'),

  body('isInternal')
    .optional()
    .isBoolean()
    .withMessage('isInternal must be a boolean value')
];

const getCommentsValidation = [
  param('id')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid ticket ID format')
];

module.exports = {
  createCommentValidation,
  getCommentsValidation
};
