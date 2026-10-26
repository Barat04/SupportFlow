const commentService = require('../services/commentService');
const auditService = require('../services/auditService');

/**
 * Creates a comment on a ticket.
 */
async function createComment(req, res, next) {
  try {
    const { message, isInternal } = req.body;
    const comment = await commentService.createComment(
      {
        ticketId: req.params.id,
        message,
        isInternal
      },
      req.user
    );

    res.status(201).json({
      success: true,
      message: comment.isInternal
        ? 'Internal note added successfully'
        : 'Reply added successfully',
      comment
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lists comments for a ticket (strictly privacy filtered).
 */
async function getComments(req, res, next) {
  try {
    const comments = await commentService.getComments(req.params.id, req.user);

    res.status(200).json({
      success: true,
      comments
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves audit history and activity for a ticket.
 */
async function getActivity(req, res, next) {
  try {
    const activity = await auditService.getTicketAuditLogs(req.params.id, req.user);

    res.status(200).json({
      success: true,
      activity
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createComment,
  getComments,
  getActivity
};
