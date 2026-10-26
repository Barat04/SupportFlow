/**
 * Ticket Status Enums.
 */
const TICKET_STATUS = Object.freeze({
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed'
});

const ALL_TICKET_STATUSES = Object.freeze(Object.values(TICKET_STATUS));

module.exports = {
  TICKET_STATUS,
  ALL_TICKET_STATUSES
};
