const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Ticket = require('../src/models/Ticket');
const Counter = require('../src/models/Counter');
const { ROLES } = require('../src/constants/roles');
const { TICKET_STATUS } = require('../src/constants/ticketStatus');
const { TICKET_PRIORITY } = require('../src/constants/ticketPriority');
const { TICKET_CATEGORY } = require('../src/constants/ticketCategory');
const { generateToken } = require('../src/services/authService');

describe('Dashboard Metrics & Search/Filter Suite (/api/dashboard & /api/tickets)', () => {
  let mongoServer;

  let customerUserA, customerTokenA;
  let customerUserB, customerTokenB;
  let agentUserA, agentTokenA;
  let adminUser, adminToken;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await connectDB(uri);
  });

  afterAll(async () => {
    await disconnectDB();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Ticket.deleteMany({});
    await Counter.deleteMany({});

    // Create test accounts
    customerUserA = await User.create({
      name: 'Customer Alice',
      email: 'alice@example.com',
      password: 'Password123!',
      role: ROLES.CUSTOMER
    });
    customerTokenA = generateToken(customerUserA);

    customerUserB = await User.create({
      name: 'Customer Bob',
      email: 'bob@example.com',
      password: 'Password123!',
      role: ROLES.CUSTOMER
    });
    customerTokenB = generateToken(customerUserB);

    agentUserA = await User.create({
      name: 'Agent Fox',
      email: 'agent@example.com',
      password: 'Password123!',
      role: ROLES.AGENT
    });
    agentTokenA = generateToken(agentUserA);

    adminUser = await User.create({
      name: 'Admin Boss',
      email: 'admin@example.com',
      password: 'Password123!',
      role: ROLES.ADMIN
    });
    adminToken = generateToken(adminUser);

    // Seed a known distribution of tickets
    // 1. Alice, Open, Urgent, Technical, Unassigned
    await Ticket.create({
      ticketNumber: 'SUP-1001',
      title: 'Database connection drop',
      description: 'Production cluster dropped connections for 5 minutes',
      category: TICKET_CATEGORY.TECHNICAL,
      priority: TICKET_PRIORITY.URGENT,
      status: TICKET_STATUS.OPEN,
      customer: customerUserA._id,
      assignedTo: null
    });

    // 2. Alice, In-Progress, High, Billing, Assigned to Agent Fox
    await Ticket.create({
      ticketNumber: 'SUP-1002',
      title: 'Invoice tax calculation mismatch',
      description: 'VAT rate applied on invoice was 20% instead of 15%',
      category: TICKET_CATEGORY.BILLING,
      priority: TICKET_PRIORITY.HIGH,
      status: TICKET_STATUS.IN_PROGRESS,
      customer: customerUserA._id,
      assignedTo: agentUserA._id
    });

    // 3. Alice, Resolved, Low, Account, Assigned to Agent Fox
    await Ticket.create({
      ticketNumber: 'SUP-1003',
      title: 'Update billing address',
      description: 'Address changed from Suite 10 to Suite 20',
      category: TICKET_CATEGORY.ACCOUNT,
      priority: TICKET_PRIORITY.LOW,
      status: TICKET_STATUS.RESOLVED,
      customer: customerUserA._id,
      assignedTo: agentUserA._id
    });

    // 4. Bob, Open, Medium, General, Unassigned
    await Ticket.create({
      ticketNumber: 'SUP-1004',
      title: 'General question about API limits',
      description: 'How many requests per minute are permitted on the standard tier?',
      category: TICKET_CATEGORY.GENERAL,
      priority: TICKET_PRIORITY.MEDIUM,
      status: TICKET_STATUS.OPEN,
      customer: customerUserB._id,
      assignedTo: null
    });

    // 5. Bob, Closed, Low, Technical, Unassigned
    await Ticket.create({
      ticketNumber: 'SUP-1005',
      title: 'Feature request for dark theme',
      description: 'Duplicate feature request already tracked in roadmap',
      category: TICKET_CATEGORY.TECHNICAL,
      priority: TICKET_PRIORITY.LOW,
      status: TICKET_STATUS.CLOSED,
      customer: customerUserB._id,
      assignedTo: null
    });
  });

  describe('GET /api/dashboard/metrics (Aggregation Pipelines)', () => {
    it('ADMIN METRICS: Aggregates global system overview correctly', async () => {
      const res = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const { overview, byStatus, byPriority, byCategory } = res.body.metrics;

      // 5 total tickets in system
      expect(overview.total).toBe(5);
      expect(overview.open).toBe(2); // SUP-1001, SUP-1004
      expect(overview.inProgress).toBe(1); // SUP-1002
      expect(overview.resolved).toBe(1); // SUP-1003
      expect(overview.closed).toBe(1); // SUP-1005

      // Unassigned non-closed tickets: SUP-1001 (open), SUP-1004 (open) = 2
      expect(overview.unassigned).toBe(2);

      // Urgent/High open or in-progress: SUP-1001 (urgent, open) + SUP-1002 (high, in_prog) = 2
      expect(overview.needsAttention).toBe(2);

      // Verify category breakdown
      expect(byCategory.technical).toBe(2);
      expect(byCategory.billing).toBe(1);
      expect(byCategory.account).toBe(1);
      expect(byCategory.general).toBe(1);

      // Verify priority breakdown
      expect(byPriority.urgent).toBe(1);
      expect(byPriority.high).toBe(1);
      expect(byPriority.medium).toBe(1);
      expect(byPriority.low).toBe(2);
    });

    it('AGENT METRICS: Accurately separates assigned queue from global queue', async () => {
      const res = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${agentTokenA}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const { assignedToMe, globalQueue } = res.body.metrics;

      // Agent Fox has SUP-1002 (in_progress, high) and SUP-1003 (resolved, low)
      expect(assignedToMe.total).toBe(2);
      expect(assignedToMe.inProgress).toBe(1);
      expect(assignedToMe.resolved).toBe(1);
      expect(assignedToMe.open).toBe(0);
      expect(assignedToMe.needsAttention).toBe(1); // SUP-1002 is high priority

      // Global queue: 2 unassigned (SUP-1001, SUP-1004) and 2 urgent attention total
      expect(globalQueue.unassigned).toBe(2);
      expect(globalQueue.urgentAttention).toBe(2);
    });

    it('CUSTOMER METRICS: Strictly scopes counts to customer tickets only', async () => {
      const res = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${customerTokenA}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const { myTickets } = res.body.metrics;

      // Alice owns 3 tickets (SUP-1001 open, SUP-1002 in_prog, SUP-1003 resolved)
      expect(myTickets.total).toBe(3);
      expect(myTickets.open).toBe(1);
      expect(myTickets.inProgress).toBe(1);
      expect(myTickets.resolved).toBe(1);
      expect(myTickets.closed).toBe(0);
    });
  });

  describe('GET /api/tickets (Advanced Search, Filtering & Sorting)', () => {
    it('SEARCH: Finds tickets matching keyword in title or description', async () => {
      const res = await request(app)
        .get('/api/tickets?search=tax')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.tickets.length).toBe(1);
      expect(res.body.tickets[0].ticketNumber).toBe('SUP-1002');
    });

    it('SEARCH: Finds ticket by exact or partial ticketNumber', async () => {
      const res = await request(app)
        .get('/api/tickets?search=SUP-1004')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.tickets.length).toBe(1);
      expect(res.body.tickets[0].title).toContain('API limits');
    });

    it('FILTER: Combines status and priority filters', async () => {
      const res = await request(app)
        .get(`/api/tickets?status=${TICKET_STATUS.OPEN}&priority=${TICKET_PRIORITY.URGENT}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.tickets.length).toBe(1);
      expect(res.body.tickets[0].ticketNumber).toBe('SUP-1001');
    });

    it('PAGINATION: Respects page and limit parameters', async () => {
      const res = await request(app)
        .get('/api/tickets?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.tickets.length).toBe(2);
      expect(res.body.pagination.total).toBe(5);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.pagination.totalPages).toBe(3);
    });

    it('SORTING: Allows sorting by ticketNumber ascending and descending', async () => {
      const resAsc = await request(app)
        .get('/api/tickets?sortBy=ticketNumber')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resAsc.statusCode).toBe(200);
      expect(resAsc.body.tickets[0].ticketNumber).toBe('SUP-1001');

      const resDesc = await request(app)
        .get('/api/tickets?sortBy=-ticketNumber')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resDesc.statusCode).toBe(200);
      expect(resDesc.body.tickets[0].ticketNumber).toBe('SUP-1005');
    });
  });
});
