/**
 * Ticket Category Enums.
 */
const TICKET_CATEGORY = Object.freeze({
  TECHNICAL: 'technical',
  BILLING: 'billing',
  ACCOUNT: 'account',
  GENERAL: 'general'
});

const ALL_TICKET_CATEGORIES = Object.freeze(Object.values(TICKET_CATEGORY));

module.exports = {
  TICKET_CATEGORY,
  ALL_TICKET_CATEGORIES
};
