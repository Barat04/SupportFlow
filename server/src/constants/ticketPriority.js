/**
 * Ticket Priority Enums.
 */
const TICKET_PRIORITY = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
});

const ALL_TICKET_PRIORITIES = Object.freeze(Object.values(TICKET_PRIORITY));

module.exports = {
  TICKET_PRIORITY,
  ALL_TICKET_PRIORITIES
};
