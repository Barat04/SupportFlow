const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Ticket = require('../src/models/Ticket');
const Comment = require('../src/models/Comment');
const Counter = require('../src/models/Counter');
const { AuditLog } = require('../src/models/AuditLog');
const { ROLES } = require('../src/constants/roles');
const { TICKET_CATEGORY } = require('../src/constants/ticketCategory');
const { TICKET_STATUS } = require('../src/constants/ticketStatus');
const { generateToken } = require('../src/services/authService');

describe('Comments, Internal Notes & Audit Trail Suite (/api/tickets/:id/comments)', () => {
  let mongoServer;

  let customerUserA, customerTokenA;
  let customerUserB, customerTokenB;
  let agentUser, agentToken;
  let adminUser, adminToken;
  let testTicket;

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
    await Comment.deleteMany({});
    await Counter.deleteMany({});
    await AuditLog.deleteMany({});

    // Setup users
    customerUserA = await User.create({
      name: 'Alice Customer',
      email: 'alice@example.com',
      password: 'Password123!',
      role: ROLES.CUSTOMER
    });
    customerTokenA = generateToken(customerUserA);

    customerUserB = await User.create({
      name: 'Bob Customer',
      email: 'bob@example.com',
      password: 'Password123!',
      role: ROLES.CUSTOMER
    });
    customerTokenB = generateToken(customerUserB);

    agentUser = await User.create({
      name: 'Agent Fox',
      email: 'agent@example.com',
      password: 'Password123!',
      role: ROLES.AGENT
    });
    agentToken = generateToken(agentUser);

    adminUser = await User.create({
      name: 'Admin Boss',
      email: 'admin@example.com',
      password: 'Password123!',
      role: ROLES.ADMIN
    });
    adminToken = generateToken(adminUser);

    // Create a base ticket owned by Alice
    const ticketRes = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${customerTokenA}`)
      .send({
        title: 'Billing issue with subscription renewal',
        description: 'Card was charged twice for the same monthly invoice cycle.',
        category: TICKET_CATEGORY.BILLING
      });

    testTicket = ticketRes.body.ticket;
  });

  describe('POST /api/tickets/:id/comments (Creation & Role Rules)', () => {
    it('should allow customer Alice to add a public reply to her own ticket', async () => {
      const res = await request(app)
        .post(`/api/tickets/${testTicket.id}/comments`)
        .set('Authorization', `Bearer ${customerTokenA}`)
        .send({
          message: 'Here is my transaction reference: TXN-998822'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.comment.message).toBe('Here is my transaction reference: TXN-998822');
      expect(res.body.comment.isInternal).toBe(false);
      expect(res.body.comment.author.email).toBe('alice@example.com');
    });

    it('SECURITY TEST: Customer attempting to create internal note must receive 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/api/tickets/${testTicket.id}/comments`)
        .set('Authorization', `Bearer ${customerTokenA}`)
        .send({
          message: 'Attempting to inject a private agent note',
          isInternal: true
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Customers cannot create internal notes');
    });

    it('SECURITY TEST: Customer Bob cannot comment on Alice ticket (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/tickets/${testTicket.id}/comments`)
        .set('Authorization', `Bearer ${customerTokenB}`)
        .send({
          message: 'Intruding on Alice ticket'
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('do not have permission');
    });

    it('should allow Support Agent to add a public reply', async () => {
      const res = await request(app)
        .post(`/api/tickets/${testTicket.id}/comments`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          message: 'Hello Alice, we have refunded the duplicate charge.',
          isInternal: false
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.comment.isInternal).toBe(false);
      expect(res.body.comment.author.role).toBe(ROLES.AGENT);
    });

    it('should allow Support Agent to add a private internal note', async () => {
      const res = await request(app)
        .post(`/api/tickets/${testTicket.id}/comments`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          message: 'INTERNAL NOTE: Stripe transaction refund ref #re_321 confirmed with finance.',
          isInternal: true
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.comment.isInternal).toBe(true);
      expect(res.body.message).toContain('Internal note added');
    });
  });

  describe('GET /api/tickets/:id/comments (Strict Internal-Note Privacy Enforcement)', () => {
    beforeEach(async () => {
      // 1. Customer adds public comment
      await request(app)
        .post(`/api/tickets/${testTicket.id}/comments`)
        .set('Authorization', `Bearer ${customerTokenA}`)
        .send({ message: 'Public comment from customer' });

      // 2. Agent adds public reply
      await request(app)
        .post(`/api/tickets/${testTicket.id}/comments`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ message: 'Public reply from agent', isInternal: false });

      // 3. Agent adds private internal note
      await request(app)
        .post(`/api/tickets/${testTicket.id}/comments`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ message: 'SECRET INTERNAL NOTE: Investigating card network glitch', isInternal: true });
    });

    it('CRITICAL PRIVACY TEST: Customer must NEVER see internal notes in comments list', async () => {
      const res = await request(app)
        .get(`/api/tickets/${testTicket.id}/comments`)
        .set('Authorization', `Bearer ${customerTokenA}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.comments.length).toBe(2); // Only 2 public comments!

      // Verify no comment returned has isInternal: true
      const hasInternalNote = res.body.comments.some((c) => c.isInternal === true);
      expect(hasInternalNote).toBe(false);

      // Verify internal message content does not appear
      const messageContents = res.body.comments.map((c) => c.message);
      expect(messageContents).not.toContain('SECRET INTERNAL NOTE: Investigating card network glitch');
    });

    it('CRITICAL PRIVACY TEST: Customer cannot bypass privacy using query params (e.g. ?isInternal=true)', async () => {
      const res = await request(app)
        .get(`/api/tickets/${testTicket.id}/comments?isInternal=true`)
        .set('Authorization', `Bearer ${customerTokenA}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.comments.length).toBe(2);
      expect(res.body.comments.some((c) => c.isInternal === true)).toBe(false);
    });

    it('Agent can see both public comments and internal notes', async () => {
      const res = await request(app)
        .get(`/api/tickets/${testTicket.id}/comments`)
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.comments.length).toBe(3); // All 3 comments!

      const internalNote = res.body.comments.find((c) => c.isInternal === true);
      expect(internalNote).toBeDefined();
      expect(internalNote.message).toContain('SECRET INTERNAL NOTE');
    });
  });

  describe('GET /api/tickets/:id/activity (Audit Logging & Timeline Privacy)', () => {
    beforeEach(async () => {
      // 1. Agent claims ticket
      await request(app)
        .patch(`/api/tickets/${testTicket.id}/assign`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ assignedTo: agentUser._id.toString() });

      // 2. Agent transitions status to in_progress
      await request(app)
        .patch(`/api/tickets/${testTicket.id}/status`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ status: TICKET_STATUS.IN_PROGRESS });

      // 3. Customer posts public comment
      await request(app)
        .post(`/api/tickets/${testTicket.id}/comments`)
        .set('Authorization', `Bearer ${customerTokenA}`)
        .send({ message: 'Any update on my issue?' });

      // 4. Agent posts internal note
      await request(app)
        .post(`/api/tickets/${testTicket.id}/comments`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ message: 'Internal confidential check', isInternal: true });
    });

    it('AUDIT TRAIL: Records lifecycle actions (CREATED, ASSIGNED, STATUS_UPDATED, COMMENT_ADDED)', async () => {
      const res = await request(app)
        .get(`/api/tickets/${testTicket.id}/activity`)
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.statusCode).toBe(200);
      const actions = res.body.activity.map((a) => a.action);

      expect(actions).toContain('CREATED');
      expect(actions).toContain('ASSIGNED');
      expect(actions).toContain('STATUS_UPDATED');
      expect(actions).toContain('COMMENT_ADDED');
    });

    it('AUDIT PRIVACY: Customer activity timeline hides internal note additions', async () => {
      const res = await request(app)
        .get(`/api/tickets/${testTicket.id}/activity`)
        .set('Authorization', `Bearer ${customerTokenA}`);

      expect(res.statusCode).toBe(200);

      // Verify no audit entry has isInternal: true
      const hasInternalAudit = res.body.activity.some((a) => a.isInternal === true);
      expect(hasInternalAudit).toBe(false);

      // Verify internal note content does not appear in customer timeline
      const descriptions = res.body.activity.map((a) => a.newValue);
      expect(descriptions).not.toContain('Internal note added');
    });
  });
});
