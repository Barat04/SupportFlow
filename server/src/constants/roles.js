/**
 * System-wide Role Enums.
 * Using constants prevents typos and ensures consistent authorization rules.
 */
const ROLES = Object.freeze({
  CUSTOMER: 'customer',
  AGENT: 'agent',
  ADMIN: 'admin'
});

const ALL_ROLES = Object.freeze(Object.values(ROLES));

module.exports = {
  ROLES,
  ALL_ROLES
};
