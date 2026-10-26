const Comment = require('../models/Comment');
const Ticket = require('../models/Ticket');
const { ROLES } = require('../constants/roles');
const { NotFoundError, ForbiddenError } = require('../utils/errors');
const auditService = require('./auditService');

/**
 * Creates a comment (public reply or internal note) under a ticket.
 * Enforces strict authorization and internal-note creation restrictions.
 * 
 * @param {Object} commentParams
 * @param {string} commentParams.ticketId
 * @param {string} commentParams.message
 * @param {boolean} [commentParams.isInternal=false]
 * @param {Object} currentUser
 * @returns {Promise<Object>}
 */
async function createComment({ ticketId, message, isInternal = false }, currentUser) {
  const ticket = await Ticket.findById(ticketId);

  if (!ticket) {
    throw new NotFoundError('Ticket not found');
  }

  let finalIsInternal = Boolean(isInternal);

  // 1. Role-based verification
  if (currentUser.role === ROLES.CUSTOMER) {
    // Customers can strictly only comment on their own tickets
    if (!ticket.customer.equals(currentUser._id)) {
      throw new ForbiddenError('You do not have permission to comment on this ticket');
    }

    // Customers are forbidden from creating internal notes
    if (finalIsInternal === true) {
      throw new ForbiddenError('Customers cannot create internal notes');
    }

    finalIsInternal = false;
  }

  // 2. Instantiate and persist comment
  const comment = new Comment({
    ticket: ticketId,
    author: currentUser._id,
    message,
    isInternal: finalIsInternal
  });

  await comment.save();
  await comment.populate('author', 'name email role');

  // 3. Log audit event (preserves isInternal flag so activity logs don't leak to customers)
  await auditService.logAction({
    ticketId,
    performedById: currentUser._id,
    action: auditService.AUDIT_ACTIONS.COMMENT_ADDED,
    fieldChanged: 'comments',
    newValue: comment.isInternal ? 'Internal note added' : 'Public reply added',
    isInternal: comment.isInternal
  });

  return comment;
}

/**
 * Retrieves comments for a ticket.
 * Customers are strictly filtered so they NEVER see internal notes.
 * 
 * @param {string} ticketId
 * @param {Object} currentUser
 * @returns {Promise<Array>}
 */
async function getComments(ticketId, currentUser) {
  const ticket = await Ticket.findById(ticketId);

  if (!ticket) {
    throw new NotFoundError('Ticket not found');
  }

  // 1. Customer ticket ownership access check
  if (
    currentUser.role === ROLES.CUSTOMER &&
    !ticket.customer.equals(currentUser._id)
  ) {
    throw new ForbiddenError('You do not have permission to view comments for this ticket');
  }

  // 2. Query filter with strict server-side internal note isolation
  const filter = { ticket: ticketId };

  if (currentUser.role === ROLES.CUSTOMER) {
    // Unconditionally force isInternal: false for customers
    filter.isInternal = false;
  }

  const comments = await Comment.find(filter)
    .populate('author', 'name email role')
    .sort({ createdAt: 1 });

  return comments;
}

module.exports = {
  createComment,
  getComments
};
