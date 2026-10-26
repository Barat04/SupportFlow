const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const Comment = require('../models/Comment');
const Counter = require('../models/Counter');
const { AuditLog, AUDIT_ACTIONS } = require('../models/AuditLog');
const { ROLES } = require('../constants/roles');
const { TICKET_STATUS } = require('../constants/ticketStatus');
const { TICKET_PRIORITY } = require('../constants/ticketPriority');
const { TICKET_CATEGORY } = require('../constants/ticketCategory');

/**
 * Seed data definitions.
 */
const SEED_USERS = [
  {
    name: 'System Administrator',
    email: 'admin@supportflow.com',
    password: 'AdminPassword123!',
    role: ROLES.ADMIN
  },
  {
    name: 'Sarah Connor',
    email: 'agent.sarah@supportflow.com',
    password: 'AgentPassword123!',
    role: ROLES.AGENT
  },
  {
    name: 'Alex Murphy',
    email: 'agent.alex@supportflow.com',
    password: 'AgentPassword123!',
    role: ROLES.AGENT
  },
  {
    name: 'Alice Freeman',
    email: 'alice@example.com',
    password: 'CustomerPassword123!',
    role: ROLES.CUSTOMER
  },
  {
    name: 'Bob Vance',
    email: 'bob@example.com',
    password: 'CustomerPassword123!',
    role: ROLES.CUSTOMER
  },
  {
    name: 'Charlie Day',
    email: 'charlie@example.com',
    password: 'CustomerPassword123!',
    role: ROLES.CUSTOMER
  }
];

/**
 * Seeds the database with test accounts, lifecycled tickets, comments, and audit records.
 * 
 * @param {string} [customUri] - Optional MongoDB URI
 * @returns {Promise<Object>} Seeded entities summary
 */
async function seedDatabase(customUri) {
  const isDirectRun = require.main === module;

  try {
    if (isDirectRun) {
      console.log('--- Starting SupportFlow Database Seeding ---');
    }

    await connectDB(customUri);

    // 1. Wipe existing records for a clean, deterministic development environment
    await Promise.all([
      User.deleteMany({}),
      Ticket.deleteMany({}),
      Comment.deleteMany({}),
      Counter.deleteMany({}),
      AuditLog.deleteMany({})
    ]);

    if (isDirectRun) {
      console.log('✓ Cleaned existing database collections');
    }

    // 2. Insert Users (pre-save hook hashes passwords via bcrypt)
    const users = await User.create(SEED_USERS);
    const userMap = {};
    users.forEach((u) => {
      userMap[u.email] = u;
    });

    if (isDirectRun) {
      console.log(`✓ Created ${users.length} user accounts (Admin, Agents, Customers)`);
    }

    const admin = userMap['admin@supportflow.com'];
    const agentSarah = userMap['agent.sarah@supportflow.com'];
    const agentAlex = userMap['agent.alex@supportflow.com'];
    const alice = userMap['alice@example.com'];
    const bob = userMap['bob@example.com'];
    const charlie = userMap['charlie@example.com'];

    // 3. Create Sample Tickets
    const ticket1 = await Ticket.create({
      ticketNumber: 'SUP-1001',
      title: 'Production database latency spikes on checkout',
      description: 'Customer checkout calls are timing out during peak traffic hours. Observed response times over 4500ms.',
      category: TICKET_CATEGORY.TECHNICAL,
      priority: TICKET_PRIORITY.URGENT,
      status: TICKET_STATUS.OPEN,
      customer: alice._id,
      assignedTo: null
    });

    const ticket2 = await Ticket.create({
      ticketNumber: 'SUP-1002',
      title: 'Double billing on Annual Enterprise subscription',
      description: 'Our corporate card was charged twice on invoice renewal. Transaction refs: #ch_9910 and #ch_9911.',
      category: TICKET_CATEGORY.BILLING,
      priority: TICKET_PRIORITY.HIGH,
      status: TICKET_STATUS.IN_PROGRESS,
      customer: alice._id,
      assignedTo: agentSarah._id
    });

    const ticket3 = await Ticket.create({
      ticketNumber: 'SUP-1003',
      title: 'Request primary account owner email change',
      description: 'Our department lead has changed and we need to transfer the primary administrator email address.',
      category: TICKET_CATEGORY.ACCOUNT,
      priority: TICKET_PRIORITY.MEDIUM,
      status: TICKET_STATUS.RESOLVED,
      customer: bob._id,
      assignedTo: agentAlex._id
    });

    const ticket4 = await Ticket.create({
      ticketNumber: 'SUP-1004',
      title: 'Inquiry regarding webhook retry policies',
      description: 'Does SupportFlow retry failed webhooks with exponential backoff or linear delays?',
      category: TICKET_CATEGORY.GENERAL,
      priority: TICKET_PRIORITY.LOW,
      status: TICKET_STATUS.CLOSED,
      customer: charlie._id,
      assignedTo: agentSarah._id
    });

    const ticket5 = await Ticket.create({
      ticketNumber: 'SUP-1005',
      title: 'SSO SAML login redirection loop on Safari',
      description: 'When logging in via Okta on macOS Safari 18, users are redirected back to the login page without error.',
      category: TICKET_CATEGORY.TECHNICAL,
      priority: TICKET_PRIORITY.HIGH,
      status: TICKET_STATUS.OPEN,
      customer: bob._id,
      assignedTo: null
    });

    // Update Counter collection so next ticket created via API is SUP-1006
    await Counter.create({ _id: 'ticketNumber', seq: 5 });

    if (isDirectRun) {
      console.log('✓ Created 5 sample tickets across all statuses and priorities');
    }

    // 4. Create Comments & Internal Notes for Ticket 2 & Ticket 3
    const comments = await Comment.create([
      // Ticket 2 (In-Progress Billing Ticket)
      {
        ticket: ticket2._id,
        author: alice._id,
        message: 'Hello, please confirm you have received our duplicate charge report.',
        isInternal: false
      },
      {
        ticket: ticket2._id,
        author: agentSarah._id,
        message: 'Hello Alice, I have escalated this to our billing operations team for immediate verification.',
        isInternal: false
      },
      {
        ticket: ticket2._id,
        author: agentSarah._id,
        message: 'INTERNAL NOTE: Verified in Stripe dashboard. Refund for #ch_9911 initiated. Expect settlement in 3-5 business days.',
        isInternal: true
      },
      // Ticket 3 (Resolved Account Ticket)
      {
        ticket: ticket3._id,
        author: agentAlex._id,
        message: 'The email transfer verification email has been dispatched. Please confirm receipt.',
        isInternal: false
      },
      {
        ticket: ticket3._id,
        author: bob._id,
        message: 'Transfer confirmed and verified. Thank you for the quick resolution!',
        isInternal: false
      }
    ]);

    if (isDirectRun) {
      console.log(`✓ Created ${comments.length} conversation comments (including private internal notes)`);
    }

    // 5. Create Audit Trail Records
    await AuditLog.create([
      // Ticket 1
      {
        ticket: ticket1._id,
        performedBy: alice._id,
        action: AUDIT_ACTIONS.CREATED,
        newValue: "Ticket created with status 'open'"
      },
      // Ticket 2 Lifecycle
      {
        ticket: ticket2._id,
        performedBy: alice._id,
        action: AUDIT_ACTIONS.CREATED,
        newValue: "Ticket created with status 'open'"
      },
      {
        ticket: ticket2._id,
        performedBy: agentSarah._id,
        action: AUDIT_ACTIONS.ASSIGNED,
        fieldChanged: 'assignedTo',
        newValue: agentSarah._id
      },
      {
        ticket: ticket2._id,
        performedBy: agentSarah._id,
        action: AUDIT_ACTIONS.STATUS_UPDATED,
        fieldChanged: 'status',
        oldValue: 'open',
        newValue: 'in_progress'
      },
      {
        ticket: ticket2._id,
        performedBy: agentSarah._id,
        action: AUDIT_ACTIONS.COMMENT_ADDED,
        fieldChanged: 'comments',
        newValue: 'Internal note added',
        isInternal: true
      },
      // Ticket 3 Lifecycle
      {
        ticket: ticket3._id,
        performedBy: bob._id,
        action: AUDIT_ACTIONS.CREATED,
        newValue: "Ticket created with status 'open'"
      },
      {
        ticket: ticket3._id,
        performedBy: agentAlex._id,
        action: AUDIT_ACTIONS.ASSIGNED,
        fieldChanged: 'assignedTo',
        newValue: agentAlex._id
      },
      {
        ticket: ticket3._id,
        performedBy: agentAlex._id,
        action: AUDIT_ACTIONS.STATUS_UPDATED,
        fieldChanged: 'status',
        oldValue: 'in_progress',
        newValue: 'resolved'
      }
    ]);

    if (isDirectRun) {
      console.log('✓ Created audit history logs for ticket lifecycles');
      console.log('\n=============================================================');
      console.log('SupportFlow Test Accounts Ready for Login:');
      console.log('=============================================================');
      console.table([
        { Role: 'Admin', Email: 'admin@supportflow.com', Password: 'AdminPassword123!' },
        { Role: 'Agent', Email: 'agent.sarah@supportflow.com', Password: 'AgentPassword123!' },
        { Role: 'Agent', Email: 'agent.alex@supportflow.com', Password: 'AgentPassword123!' },
        { Role: 'Customer', Email: 'alice@example.com', Password: 'CustomerPassword123!' },
        { Role: 'Customer', Email: 'bob@example.com', Password: 'CustomerPassword123!' },
        { Role: 'Customer', Email: 'charlie@example.com', Password: 'CustomerPassword123!' }
      ]);
      console.log('=============================================================\n');
    }

    return {
      usersCount: users.length,
      ticketsCount: 5,
      commentsCount: comments.length
    };
  } catch (error) {
    console.error('[Seed Error] Failed to seed database:', error);
    throw error;
  } finally {
    if (isDirectRun) {
      await disconnectDB();
      process.exit(0);
    }
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = {
  seedDatabase,
  SEED_USERS
};
