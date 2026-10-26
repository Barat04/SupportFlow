const { body, param } = require('express-validator');
const mongoose = require('mongoose');
const { ALL_TICKET_STATUSES } = require('../constants/ticketStatus');
const { ALL_TICKET_PRIORITIES } = require('../constants/ticketPriority');
const { ALL_TICKET_CATEGORIES } = require('../constants/ticketCategory');

const createTicketValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Ticket title is required')
    .isLength({ min: 3, max: 120 })
    .withMessage('Title must be between 3 and 120 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Ticket description is required')
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters'),

  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isIn(ALL_TICKET_CATEGORIES)
    .withMessage(`Category must be one of: ${ALL_TICKET_CATEGORIES.join(', ')}`),

  body('priority')
    .optional()
    .isIn(ALL_TICKET_PRIORITIES)
    .withMessage(`Priority must be one of: ${ALL_TICKET_PRIORITIES.join(', ')}`)
];

const updateStatusValidation = [
  param('id')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid ticket ID format'),

  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(ALL_TICKET_STATUSES)
    .withMessage(`Status must be one of: ${ALL_TICKET_STATUSES.join(', ')}`)
];

const updatePriorityValidation = [
  param('id')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid ticket ID format'),

  body('priority')
    .notEmpty()
    .withMessage('Priority is required')
    .isIn(ALL_TICKET_PRIORITIES)
    .withMessage(`Priority must be one of: ${ALL_TICKET_PRIORITIES.join(', ')}`)
];

const assignTicketValidation = [
  param('id')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid ticket ID format'),

  body('assignedTo')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === '') return true;
      return mongoose.Types.ObjectId.isValid(value);
    })
    .withMessage('assignedTo must be a valid User ID or null')
];

module.exports = {
  createTicketValidation,
  updateStatusValidation,
  updatePriorityValidation,
  assignTicketValidation
};
