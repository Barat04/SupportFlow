const { AuditLog, AUDIT_ACTIONS } = require('../models/AuditLog');
const { ROLES } = require('../constants/roles');

/**
 * Creates an immutable audit record for a ticket action.
 * 
 * @param {Object} entry
 * @param {string} entry.ticketId
 * @param {string} entry.performedById
 * @param {string} entry.action
 * @param {string} [entry.fieldChanged]
 * @param {*} [entry.oldValue]
 * @param {*} [entry.newValue]
 * @param {boolean} [entry.isInternal=false]
 * @returns {Promise<Object>}
 */
async function logAction({
  ticketId,
  performedById,
  action,
  fieldChanged = null,
  oldValue = null,
  newValue = null,
  isInternal = false
}) {
  const auditEntry = new AuditLog({
    ticket: ticketId,
    performedBy: performedById,
    action,
    fieldChanged,
    oldValue,
    newValue,
    isInternal
  });

  await auditEntry.save();
  return auditEntry;
}

/**
 * Retrieves the audit trail for a ticket with strict privacy filtering.
 * Customers never receive events tagged with isInternal: true.
 * 
 * @param {string} ticketId
 * @param {Object} currentUser
 * @returns {Promise<Array>}
 */
async function getTicketAuditLogs(ticketId, currentUser) {
  const filter = { ticket: ticketId };

  if (currentUser.role === ROLES.CUSTOMER) {
    // Unconditionally filter out internal activity for customers
    filter.isInternal = false;
  }

  const logs = await AuditLog.find(filter)
    .populate('performedBy', 'name role')
    .sort({ createdAt: 1 });

  return logs;
}

module.exports = {
  logAction,
  getTicketAuditLogs,
  AUDIT_ACTIONS
};
