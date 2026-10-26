const ticketService = require('../services/ticketService');

/**
 * Creates a new ticket.
 */
async function createTicket(req, res, next) {
  try {
    const { title, description, category, priority } = req.body;
    const ticket = await ticketService.createTicket(
      { title, description, category, priority },
      req.user
    );

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      ticket
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lists tickets with role scoping, filters, and pagination.
 */
async function getTickets(req, res, next) {
  try {
    const result = await ticketService.getTickets(req.query, req.user);

    res.status(200).json({
      success: true,
      tickets: result.tickets,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves a single ticket by ID.
 */
async function getTicketById(req, res, next) {
  try {
    const ticket = await ticketService.getTicketById(req.params.id, req.user);

    res.status(200).json({
      success: true,
      ticket
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Updates a ticket status.
 */
async function updateStatus(req, res, next) {
  try {
    const { status } = req.body;
    const ticket = await ticketService.updateTicketStatus(req.params.id, status, req.user);

    res.status(200).json({
      success: true,
      message: `Ticket status updated to '${status}'`,
      ticket
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Updates a ticket priority.
 */
async function updatePriority(req, res, next) {
  try {
    const { priority } = req.body;
    const ticket = await ticketService.updateTicketPriority(req.params.id, priority, req.user);

    res.status(200).json({
      success: true,
      message: `Ticket priority updated to '${priority}'`,
      ticket
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Assigns or claims a ticket.
 */
async function assignTicket(req, res, next) {
  try {
    const { assignedTo } = req.body;
    const ticket = await ticketService.assignTicket(req.params.id, assignedTo, req.user);

    res.status(200).json({
      success: true,
      message: ticket.assignedTo
        ? `Ticket assigned successfully`
        : `Ticket unassigned successfully`,
      ticket
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  updateStatus,
  updatePriority,
  assignTicket
};
