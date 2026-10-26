const express = require('express');
const ticketController = require('../controllers/ticketController');
const commentController = require('../controllers/commentController');
const {
  createTicketValidation,
  updateStatusValidation,
  updatePriorityValidation,
  assignTicketValidation
} = require('../validations/ticketValidation');
const {
  createCommentValidation,
  getCommentsValidation
} = require('../validations/commentValidation');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');
const { ROLES } = require('../constants/roles');

const router = express.Router();

// All ticket routes require authentication
router.use(authenticate);

// Ticket CRUD
router.post(
  '/',
  createTicketValidation,
  validate,
  ticketController.createTicket
);

router.get('/', ticketController.getTickets);

router.get('/:id', ticketController.getTicketById);

// Status updates (state machine + ownership enforced in service)
router.patch(
  '/:id/status',
  updateStatusValidation,
  validate,
  ticketController.updateStatus
);

// Priority updates (restricted to Agent and Admin)
router.patch(
  '/:id/priority',
  authorizeRoles(ROLES.AGENT, ROLES.ADMIN),
  updatePriorityValidation,
  validate,
  ticketController.updatePriority
);

// Assignment updates (Agent can self-claim, Admin can assign to anyone)
router.patch(
  '/:id/assign',
  authorizeRoles(ROLES.AGENT, ROLES.ADMIN),
  assignTicketValidation,
  validate,
  ticketController.assignTicket
);

// Comments subresource
router.post(
  '/:id/comments',
  createCommentValidation,
  validate,
  commentController.createComment
);

router.get(
  '/:id/comments',
  getCommentsValidation,
  validate,
  commentController.getComments
);

// Audit history & activity timeline
router.get(
  '/:id/activity',
  getCommentsValidation,
  validate,
  commentController.getActivity
);

module.exports = router;
