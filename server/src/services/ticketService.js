const Ticket = require('../models/Ticket');
const Counter = require('../models/Counter');
const User = require('../models/User');
const { ROLES } = require('../constants/roles');
const { TICKET_STATUS } = require('../constants/ticketStatus');
const {
  NotFoundError,
  ForbiddenError,
  UnprocessableEntityError,
  BadRequestError
} = require('../utils/errors');
const auditService = require('./auditService');

/**
 * Valid state machine transitions.
 * Defines allowed next states for each current status.
 */
const VALID_STATUS_TRANSITIONS = Object.freeze({
  [TICKET_STATUS.OPEN]: [TICKET_STATUS.IN_PROGRESS, TICKET_STATUS.CLOSED],
  [TICKET_STATUS.IN_PROGRESS]: [TICKET_STATUS.RESOLVED, TICKET_STATUS.OPEN],
  [TICKET_STATUS.RESOLVED]: [TICKET_STATUS.CLOSED, TICKET_STATUS.IN_PROGRESS],
  [TICKET_STATUS.CLOSED]: [TICKET_STATUS.OPEN] // Reopenable by Admin only
});

/**
 * Creates a new ticket.
 * Sequential ticketNumber (e.g. SUP-1001) is atomically generated.
 * 
 * @param {Object} ticketData
 * @param {Object} currentUser
 * @returns {Promise<Object>}
 */
async function createTicket({ title, description, category, priority }, currentUser) {
  const seq = await Counter.getNextSequence('ticketNumber');
  const ticketNumber = `SUP-${seq}`;

  const ticket = new Ticket({
    ticketNumber,
    title,
    description,
    category,
    priority: priority || undefined,
    customer: currentUser._id,
    status: TICKET_STATUS.OPEN
  });

  await ticket.save();
  await ticket.populate('customer', 'name email role');

  await auditService.logAction({
    ticketId: ticket._id,
    performedById: currentUser._id,
    action: auditService.AUDIT_ACTIONS.CREATED,
    newValue: `Ticket created with status '${ticket.status}'`
  });

  return ticket;
}

/**
 * Retrieves tickets with role scoping, filtering, sorting, and pagination.
 * 
 * @param {Object} queryParams
 * @param {Object} currentUser
 * @returns {Promise<{ tickets: Array, pagination: Object }>}
 */
async function getTickets(queryParams, currentUser) {
  const {
    page = 1,
    limit = 10,
    status,
    priority,
    category,
    search,
    assignedTo,
    sortBy = '-createdAt'
  } = queryParams;

  const filter = {};

  // 1. Role-based scoping (Strict Backend Enforcement)
  if (currentUser.role === ROLES.CUSTOMER) {
    // Customers can strictly ONLY view their own tickets
    filter.customer = currentUser._id;
  } else if (currentUser.role === ROLES.AGENT) {
    // Agents have visibility to the queue, but can filter for "assigned to me" or "unassigned"
    if (assignedTo === 'me') {
      filter.assignedTo = currentUser._id;
    } else if (assignedTo === 'unassigned') {
      filter.assignedTo = null;
    } else if (assignedTo && assignedTo !== 'all') {
      filter.assignedTo = assignedTo;
    }
  } else if (currentUser.role === ROLES.ADMIN) {
    if (assignedTo === 'unassigned') {
      filter.assignedTo = null;
    } else if (assignedTo && assignedTo !== 'all') {
      filter.assignedTo = assignedTo;
    }
  }

  // 2. Field Filters
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (category) filter.category = category;

  // 3. Date Range Filter
  const { startDate, endDate } = queryParams;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate && !isNaN(Date.parse(startDate))) {
      filter.createdAt.$gte = new Date(startDate);
    }
    if (endDate && !isNaN(Date.parse(endDate))) {
      filter.createdAt.$lte = new Date(endDate);
    }
  }

  // 4. Keyword Search (ticketNumber, title, description)
  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [
      { ticketNumber: searchRegex },
      { title: searchRegex },
      { description: searchRegex }
    ];
  }

  // 5. Allowed Sort Fields Whitelist
  const allowedSorts = [
    'createdAt', '-createdAt',
    'updatedAt', '-updatedAt',
    'priority', '-priority',
    'status', '-status',
    'ticketNumber', '-ticketNumber'
  ];
  const safeSort = allowedSorts.includes(sortBy) ? sortBy : '-createdAt';

  // 6. Pagination math
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const [tickets, total] = await Promise.all([
    Ticket.find(filter)
      .populate('customer', 'name email role')
      .populate('assignedTo', 'name email role')
      .sort(safeSort)
      .skip(skip)
      .limit(limitNum),
    Ticket.countDocuments(filter)
  ]);

  return {
    tickets,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1
    }
  };
}

/**
 * Retrieves a single ticket by ID with strict ownership/role verification.
 * 
 * @param {string} ticketId
 * @param {Object} currentUser
 * @returns {Promise<Object>}
 */
async function getTicketById(ticketId, currentUser) {
  const ticket = await Ticket.findById(ticketId)
    .populate('customer', 'name email role')
    .populate('assignedTo', 'name email role');

  if (!ticket) {
    throw new NotFoundError('Ticket not found');
  }

  // Ownership verification for customers
  if (
    currentUser.role === ROLES.CUSTOMER &&
    !ticket.customer._id.equals(currentUser._id)
  ) {
    throw new ForbiddenError('You do not have permission to view this ticket');
  }

  return ticket;
}

/**
 * Updates a ticket status according to state machine rules and user roles.
 * 
 * @param {string} ticketId
 * @param {string} targetStatus
 * @param {Object} currentUser
 * @returns {Promise<Object>}
 */
async function updateTicketStatus(ticketId, targetStatus, currentUser) {
  const ticket = await Ticket.findById(ticketId);

  if (!ticket) {
    throw new NotFoundError('Ticket not found');
  }

  const currentStatus = ticket.status;

  // No-op if target status is the same
  if (currentStatus === targetStatus) {
    return ticket;
  }

  // 1. Role-based transition authorization
  if (currentUser.role === ROLES.CUSTOMER) {
    // Customers can only view and close their own tickets
    if (!ticket.customer.equals(currentUser._id)) {
      throw new ForbiddenError('You do not have permission to update this ticket');
    }
    if (targetStatus !== TICKET_STATUS.CLOSED) {
      throw new ForbiddenError('Customers can only close their own tickets');
    }
  } else if (currentUser.role === ROLES.AGENT) {
    // Agents can only update status on tickets assigned to them
    if (!ticket.assignedTo || !ticket.assignedTo.equals(currentUser._id)) {
      throw new ForbiddenError(
        'Agents can only update status on tickets assigned to them. Please claim the ticket first.'
      );
    }
  }

  // 2. Reopening closed tickets is restricted to Administrators
  if (currentStatus === TICKET_STATUS.CLOSED && currentUser.role !== ROLES.ADMIN) {
    throw new ForbiddenError('Only administrators are authorized to reopen closed tickets');
  }

  // 3. State machine transition check
  const allowedNextStates = VALID_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowedNextStates.includes(targetStatus)) {
    throw new UnprocessableEntityError(
      `Invalid status transition: Cannot change ticket from '${currentStatus}' to '${targetStatus}'. ` +
      `Allowed transitions from '${currentStatus}' are: [${allowedNextStates.join(', ')}]`
    );
  }

  ticket.status = targetStatus;
  await ticket.save();

  await ticket.populate('customer', 'name email role');
  await ticket.populate('assignedTo', 'name email role');

  await auditService.logAction({
    ticketId: ticket._id,
    performedById: currentUser._id,
    action: auditService.AUDIT_ACTIONS.STATUS_UPDATED,
    fieldChanged: 'status',
    oldValue: currentStatus,
    newValue: targetStatus
  });

  return ticket;
}

/**
 * Updates a ticket's priority.
 * 
 * @param {string} ticketId
 * @param {string} newPriority
 * @param {Object} currentUser
 * @returns {Promise<Object>}
 */
async function updateTicketPriority(ticketId, newPriority, currentUser) {
  if (currentUser.role === ROLES.CUSTOMER) {
    throw new ForbiddenError('Customers cannot change ticket priority');
  }

  const ticket = await Ticket.findById(ticketId);
  if (!ticket) {
    throw new NotFoundError('Ticket not found');
  }

  if (currentUser.role === ROLES.AGENT) {
    if (!ticket.assignedTo || !ticket.assignedTo.equals(currentUser._id)) {
      throw new ForbiddenError('Agents can only change priority on tickets assigned to them');
    }
  }

  const oldPriority = ticket.priority;
  ticket.priority = newPriority;
  await ticket.save();

  await ticket.populate('customer', 'name email role');
  await ticket.populate('assignedTo', 'name email role');

  await auditService.logAction({
    ticketId: ticket._id,
    performedById: currentUser._id,
    action: auditService.AUDIT_ACTIONS.PRIORITY_UPDATED,
    fieldChanged: 'priority',
    oldValue: oldPriority,
    newValue: newPriority
  });

  return ticket;
}

/**
 * Assigns or reassigns a ticket.
 * - Agents can ONLY claim unassigned tickets to themselves.
 * - Admins can assign or reassign any ticket to any valid agent or unassign.
 * 
 * @param {string} ticketId
 * @param {string|null} targetAssigneeId
 * @param {Object} currentUser
 * @returns {Promise<Object>}
 */
async function assignTicket(ticketId, targetAssigneeId, currentUser) {
  if (currentUser.role === ROLES.CUSTOMER) {
    throw new ForbiddenError('Customers cannot assign tickets');
  }

  const ticket = await Ticket.findById(ticketId);
  if (!ticket) {
    throw new NotFoundError('Ticket not found');
  }

  const oldAssigneeId = ticket.assignedTo;

  if (currentUser.role === ROLES.AGENT) {
    // Agents can only claim unassigned tickets for themselves
    if (ticket.assignedTo !== null) {
      throw new ForbiddenError('This ticket is already assigned. Only administrators can reassign tickets.');
    }
    if (targetAssigneeId && targetAssigneeId.toString() !== currentUser._id.toString()) {
      throw new ForbiddenError('Agents can only assign tickets to themselves');
    }
    ticket.assignedTo = currentUser._id;
  } else if (currentUser.role === ROLES.ADMIN) {
    if (targetAssigneeId === null || targetAssigneeId === '') {
      ticket.assignedTo = null;
    } else {
      const assignee = await User.findById(targetAssigneeId);
      if (!assignee || !assignee.isActive) {
        throw new BadRequestError('Assignee user does not exist or is inactive');
      }
      if (assignee.role !== ROLES.AGENT && assignee.role !== ROLES.ADMIN) {
        throw new BadRequestError('Tickets can only be assigned to agents or administrators');
      }
      ticket.assignedTo = assignee._id;
    }
  }

  await ticket.save();
  await ticket.populate('customer', 'name email role');
  await ticket.populate('assignedTo', 'name email role');

  await auditService.logAction({
    ticketId: ticket._id,
    performedById: currentUser._id,
    action: auditService.AUDIT_ACTIONS.ASSIGNED,
    fieldChanged: 'assignedTo',
    oldValue: oldAssigneeId,
    newValue: ticket.assignedTo
  });

  return ticket;
}

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  updateTicketStatus,
  updateTicketPriority,
  assignTicket,
  VALID_STATUS_TRANSITIONS
};
