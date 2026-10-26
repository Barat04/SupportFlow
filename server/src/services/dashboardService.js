const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const { ROLES } = require('../constants/roles');
const { TICKET_STATUS } = require('../constants/ticketStatus');
const { TICKET_PRIORITY } = require('../constants/ticketPriority');

/**
 * Normalizes an array of { _id, count } groups into a key-value map with default 0s.
 * 
 * @param {Array<{ _id: string, count: number }>} groupArray 
 * @param {Array<string>} allKeys 
 * @returns {Record<string, number>}
 */
function normalizeCounts(groupArray, allKeys) {
  const map = {};
  allKeys.forEach((key) => {
    map[key] = 0;
  });
  if (Array.isArray(groupArray)) {
    groupArray.forEach((item) => {
      if (item._id && map[item._id] !== undefined) {
        map[item._id] = item.count;
      }
    });
  }
  return map;
}

/**
 * Computes live dashboard metrics using MongoDB aggregation pipelines.
 * Output is role-tailored for Administrator, Agent, or Customer.
 * 
 * @param {Object} currentUser 
 * @returns {Promise<Object>}
 */
async function getDashboardMetrics(currentUser) {
  const userRole = currentUser.role;

  if (userRole === ROLES.ADMIN) {
    // Multi-faceted aggregation across all system tickets
    const [result] = await Ticket.aggregate([
      {
        $facet: {
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          byPriority: [
            { $group: { _id: '$priority', count: { $sum: 1 } } }
          ],
          byCategory: [
            { $group: { _id: '$category', count: { $sum: 1 } } }
          ],
          unassigned: [
            { $match: { assignedTo: null, status: { $ne: TICKET_STATUS.CLOSED } } },
            { $count: 'count' }
          ],
          urgentAttention: [
            {
              $match: {
                priority: { $in: [TICKET_PRIORITY.HIGH, TICKET_PRIORITY.URGENT] },
                status: { $in: [TICKET_STATUS.OPEN, TICKET_STATUS.IN_PROGRESS] }
              }
            },
            { $count: 'count' }
          ],
          total: [
            { $count: 'count' }
          ]
        }
      }
    ]);

    const totalCount = result.total[0] ? result.total[0].count : 0;
    const unassignedCount = result.unassigned[0] ? result.unassigned[0].count : 0;
    const urgentAttentionCount = result.urgentAttention[0] ? result.urgentAttention[0].count : 0;

    const statusCounts = normalizeCounts(
      result.byStatus,
      Object.values(TICKET_STATUS)
    );
    const priorityCounts = normalizeCounts(
      result.byPriority,
      Object.values(TICKET_PRIORITY)
    );

    const categoryMap = {};
    result.byCategory.forEach((item) => {
      if (item._id) categoryMap[item._id] = item.count;
    });

    return {
      role: ROLES.ADMIN,
      overview: {
        total: totalCount,
        open: statusCounts[TICKET_STATUS.OPEN],
        inProgress: statusCounts[TICKET_STATUS.IN_PROGRESS],
        resolved: statusCounts[TICKET_STATUS.RESOLVED],
        closed: statusCounts[TICKET_STATUS.CLOSED],
        unassigned: unassignedCount,
        needsAttention: urgentAttentionCount
      },
      byStatus: statusCounts,
      byPriority: priorityCounts,
      byCategory: categoryMap
    };
  }

  if (userRole === ROLES.AGENT) {
    const agentId = new mongoose.Types.ObjectId(currentUser._id);

    const [result] = await Ticket.aggregate([
      {
        $facet: {
          myStatus: [
            { $match: { assignedTo: agentId } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          myTotal: [
            { $match: { assignedTo: agentId } },
            { $count: 'count' }
          ],
          myHighPriority: [
            {
              $match: {
                assignedTo: agentId,
                priority: { $in: [TICKET_PRIORITY.HIGH, TICKET_PRIORITY.URGENT] },
                status: { $in: [TICKET_STATUS.OPEN, TICKET_STATUS.IN_PROGRESS] }
              }
            },
            { $count: 'count' }
          ],
          queueUnassigned: [
            { $match: { assignedTo: null, status: { $ne: TICKET_STATUS.CLOSED } } },
            { $count: 'count' }
          ],
          queueUrgent: [
            {
              $match: {
                priority: { $in: [TICKET_PRIORITY.HIGH, TICKET_PRIORITY.URGENT] },
                status: { $in: [TICKET_STATUS.OPEN, TICKET_STATUS.IN_PROGRESS] }
              }
            },
            { $count: 'count' }
          ]
        }
      }
    ]);

    const myStatusCounts = normalizeCounts(
      result.myStatus,
      Object.values(TICKET_STATUS)
    );
    const myTotal = result.myTotal[0] ? result.myTotal[0].count : 0;
    const myHighPriority = result.myHighPriority[0] ? result.myHighPriority[0].count : 0;
    const queueUnassigned = result.queueUnassigned[0] ? result.queueUnassigned[0].count : 0;
    const queueUrgent = result.queueUrgent[0] ? result.queueUrgent[0].count : 0;

    return {
      role: ROLES.AGENT,
      assignedToMe: {
        total: myTotal,
        open: myStatusCounts[TICKET_STATUS.OPEN],
        inProgress: myStatusCounts[TICKET_STATUS.IN_PROGRESS],
        resolved: myStatusCounts[TICKET_STATUS.RESOLVED],
        closed: myStatusCounts[TICKET_STATUS.CLOSED],
        needsAttention: myHighPriority
      },
      globalQueue: {
        unassigned: queueUnassigned,
        urgentAttention: queueUrgent
      }
    };
  }

  // Customer Metrics: Strictly scoped to own tickets
  const customerId = new mongoose.Types.ObjectId(currentUser._id);

  const [result] = await Ticket.aggregate([
    { $match: { customer: customerId } },
    {
      $facet: {
        byStatus: [
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ],
        total: [
          { $count: 'count' }
        ]
      }
    }
  ]);

  const statusCounts = normalizeCounts(
    result.byStatus,
    Object.values(TICKET_STATUS)
  );
  const total = result.total[0] ? result.total[0].count : 0;

  return {
    role: ROLES.CUSTOMER,
    myTickets: {
      total,
      open: statusCounts[TICKET_STATUS.OPEN],
      inProgress: statusCounts[TICKET_STATUS.IN_PROGRESS],
      resolved: statusCounts[TICKET_STATUS.RESOLVED],
      closed: statusCounts[TICKET_STATUS.CLOSED]
    }
  };
}

module.exports = {
  getDashboardMetrics
};
