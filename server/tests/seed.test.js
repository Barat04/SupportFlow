const { MongoMemoryServer } = require('mongodb-memory-server');
const { disconnectDB } = require('../src/config/db');
const { seedDatabase } = require('../src/scripts/seed');
const User = require('../src/models/User');
const Ticket = require('../src/models/Ticket');
const Comment = require('../src/models/Comment');
const Counter = require('../src/models/Counter');
const { AuditLog } = require('../src/models/AuditLog');
const { ROLES } = require('../src/constants/roles');

describe('Database Seeding Script (server/src/scripts/seed.js)', () => {
  let mongoServer;
  let mongoUri;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
  });

  afterAll(async () => {
    await disconnectDB();
    await mongoServer.stop();
  });

  it('should seed database cleanly and return counts summary', async () => {
    const summary = await seedDatabase(mongoUri);

    expect(summary.usersCount).toBe(6);
    expect(summary.ticketsCount).toBe(5);
    expect(summary.commentsCount).toBe(5);

    // Verify User accounts and roles
    const users = await User.find({});
    expect(users.length).toBe(6);

    const admin = await User.findOne({ email: 'admin@supportflow.com' }).select('+password');
    expect(admin).not.toBeNull();
    expect(admin.role).toBe(ROLES.ADMIN);
    const isAdminPasswordValid = await admin.comparePassword('AdminPassword123!');
    expect(isAdminPasswordValid).toBe(true);

    const agent = await User.findOne({ email: 'agent.sarah@supportflow.com' });
    expect(agent).not.toBeNull();
    expect(agent.role).toBe(ROLES.AGENT);

    const customer = await User.findOne({ email: 'alice@example.com' });
    expect(customer).not.toBeNull();
    expect(customer.role).toBe(ROLES.CUSTOMER);

    // Verify Tickets
    const tickets = await Ticket.find({}).sort('ticketNumber');
    expect(tickets.length).toBe(5);
    expect(tickets[0].ticketNumber).toBe('SUP-1001');
    expect(tickets[4].ticketNumber).toBe('SUP-1005');

    // Verify Counter is initialized for subsequent API creations
    const counter = await Counter.findById('ticketNumber');
    expect(counter).not.toBeNull();
    expect(counter.seq).toBe(5);

    // Verify Comments and Internal Notes
    const comments = await Comment.find({});
    expect(comments.length).toBe(5);
    const internalNotes = comments.filter((c) => c.isInternal === true);
    expect(internalNotes.length).toBe(1);

    // Verify Audit Logs
    const auditLogs = await AuditLog.find({});
    expect(auditLogs.length).toBeGreaterThanOrEqual(7);
  });

  it('IDEMPOTENCE: Re-running seedDatabase wipes and repopulates without unique constraint violations', async () => {
    // Run second time
    const summary = await seedDatabase(mongoUri);

    expect(summary.usersCount).toBe(6);
    expect(summary.ticketsCount).toBe(5);

    const userCount = await User.countDocuments({});
    expect(userCount).toBe(6); // Not duplicated to 12
  });
});
