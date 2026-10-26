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

describe('Ticket Management & State Machine Suite (/api/tickets)', () => {
  let mongoServer;

  // Test entities
  let customerUserA, customerTokenA;
  let customerUserB, customerTokenB;
  let agentUser1, agentToken1;
  let agentUser2, agentToken2;
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

    // Seed test users
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

    agentUser1 = await User.create({
      name: 'Agent Smith',
      email: 'agent1@example.com',
      password: 'Password123!',
      role: ROLES.AGENT
    });
    agentToken1 = generateToken(agentUser1);

    agentUser2 = await User.create({
      name: 'Agent Jones',
      email: 'agent2@example.com',
      password: 'Password123!',
      role: ROLES.AGENT
    });
    agentToken2 = generateToken(agentUser2);

    adminUser = await User.create({
      name: 'Admin Boss',
      email: 'admin@example.com',
      password: 'Password123!',
      role: ROLES.ADMIN
    });
    adminToken = generateToken(adminUser);
  });

  describe('POST /api/tickets (Ticket Creation)', () => {
    it('should allow customer to create a ticket with sequential SUP-xxxx number', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${customerTokenA}`)
        .send({
          title: 'Cannot access billing invoice',
          description: 'When I click download invoice on the portal, a blank page appears.',
          category: TICKET_CATEGORY.BILLING,
          priority: TICKET_PRIORITY.HIGH
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.ticket).toHaveProperty('id');
      expect(res.body.ticket.ticketNumber).toBe('SUP-1001');
      expect(res.body.ticket.status).toBe(TICKET_STATUS.OPEN);
      expect(res.body.ticket.priority).toBe(TICKET_PRIORITY.HIGH);
      expect(res.body.ticket.category).toBe(TICKET_CATEGORY.BILLING);
      expect(res.body.ticket.customer.email).toBe('alice@example.com');
      expect(res.body.ticket.assignedTo).toBeNull();
    });

    it('should increment sequential counter for subsequent tickets', async () => {
      const res1 = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${customerTokenA}`)
        .send({
          title: 'Ticket 1',
          description: 'Description 1 with enough characters',
          category: TICKET_CATEGORY.TECHNICAL
        });

      const res2 = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${customerTokenB}`)
        .send({
          title: 'Ticket 2',
          description: 'Description 2 with enough characters',
          category: TICKET_CATEGORY.ACCOUNT
        });

      expect(res1.body.ticket.ticketNumber).toBe('SUP-1001');
      expect(res2.body.ticket.ticketNumber).toBe('SUP-1002');
    });

    it('should return 400 Bad Request on invalid ticket payload', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${customerTokenA}`)
        .send({
          title: 'AB', // too short (<3)
          description: 'short', // too short (<10)
          category: 'invalid_category'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('GET /api/tickets & GET /api/tickets/:id (Role Scoping & Privacy)', () => {
    let ticketA, ticketB;

    beforeEach(async () => {
      const resA = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${customerTokenA}`)
        .send({
          title: 'Ticket of Alice',
          description: 'Alice issue details with enough characters',
          category: TICKET_CATEGORY.GENERAL
        });
      ticketA = resA.body.ticket;

      const resB = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${customerTokenB}`)
        .send({
          title: 'Ticket of Bob',
          description: 'Bob issue details with enough characters',
          category: TICKET_CATEGORY.TECHNICAL
        });
      ticketB = resB.body.ticket;
    });

    it('CUSTOMER PRIVACY: Customer Alice should only see her own tickets', async () => {
      const res = await request(app)
        .get('/api/tickets')
        .set('Authorization', `Bearer ${customerTokenA}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.tickets.length).toBe(1);
      expect(res.body.tickets[0].id).toBe(ticketA.id);
      expect(res.body.tickets[0].title).toBe('Ticket of Alice');
    });

    it('CUSTOMER PRIVACY: Customer Alice should be blocked from accessing Bob ticket by ID (403)', async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticketB.id}`)
        .set('Authorization', `Bearer ${customerTokenA}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('do not have permission');
    });

    it('AGENT VISIBILITY: Support Agent should see all tickets in queue', async () => {
      const res = await request(app)
        .get('/api/tickets')
        .set('Authorization', `Bearer ${agentToken1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.tickets.length).toBe(2);
    });
  });

  describe('PATCH /api/tickets/:id/assign (Ticket Assignment & Claiming)', () => {
    let unassignedTicket;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${customerTokenA}`)
        .send({
          title: 'System bug report',
          description: 'Application crashes when saving profile details',
          category: TICKET_CATEGORY.TECHNICAL
        });
      unassignedTicket = res.body.ticket;
    });

    it('should allow Agent 1 to claim an unassigned ticket', async () => {
      const res = await request(app)
        .patch(`/api/tickets/${unassignedTicket.id}/assign`)
        .set('Authorization', `Bearer ${agentToken1}`)
        .send({ assignedTo: agentUser1._id.toString() });

      expect(res.statusCode).toBe(200);
      expect(res.body.ticket.assignedTo.id).toBe(agentUser1._id.toString());
    });

    it('should block Agent 2 from reassigning a ticket already claimed by Agent 1 (403)', async () => {
      // Agent 1 claims ticket
      await request(app)
        .patch(`/api/tickets/${unassignedTicket.id}/assign`)
        .set('Authorization', `Bearer ${agentToken1}`)
        .send({ assignedTo: agentUser1._id.toString() });

      // Agent 2 attempts to steal/claim
      const res = await request(app)
        .patch(`/api/tickets/${unassignedTicket.id}/assign`)
        .set('Authorization', `Bearer ${agentToken2}`)
        .send({ assignedTo: agentUser2._id.toString() });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toContain('already assigned');
    });

    it('should allow Admin to reassign any ticket to any agent', async () => {
      // Agent 1 claims
      await request(app)
        .patch(`/api/tickets/${unassignedTicket.id}/assign`)
        .set('Authorization', `Bearer ${agentToken1}`)
        .send({ assignedTo: agentUser1._id.toString() });

      // Admin reassigns to Agent 2
      const res = await request(app)
        .patch(`/api/tickets/${unassignedTicket.id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignedTo: agentUser2._id.toString() });

      expect(res.statusCode).toBe(200);
      expect(res.body.ticket.assignedTo.id).toBe(agentUser2._id.toString());
    });
  });

  describe('PATCH /api/tickets/:id/status (State Machine & Permissions)', () => {
    let ticket;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${customerTokenA}`)
        .send({
          title: 'Need account email change',
          description: 'I would like to change my primary login email address',
          category: TICKET_CATEGORY.ACCOUNT
        });
      ticket = res.body.ticket;

      // Agent 1 claims the ticket
      await request(app)
        .patch(`/api/tickets/${ticket.id}/assign`)
        .set('Authorization', `Bearer ${agentToken1}`)
        .send({ assignedTo: agentUser1._id.toString() });
    });

    it('should permit assigned Agent 1 to transition open -> in_progress', async () => {
      const res = await request(app)
        .patch(`/api/tickets/${ticket.id}/status`)
        .set('Authorization', `Bearer ${agentToken1}`)
        .send({ status: TICKET_STATUS.IN_PROGRESS });

      expect(res.statusCode).toBe(200);
      expect(res.body.ticket.status).toBe(TICKET_STATUS.IN_PROGRESS);
    });

    it('should block unassigned Agent 2 from changing status of Agent 1 ticket (403)', async () => {
      const res = await request(app)
        .patch(`/api/tickets/${ticket.id}/status`)
        .set('Authorization', `Bearer ${agentToken2}`)
        .send({ status: TICKET_STATUS.IN_PROGRESS });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toContain('assigned to them');
    });

    it('STATE MACHINE ENFORCEMENT: should reject invalid transition open -> resolved directly (422)', async () => {
      const res = await request(app)
        .patch(`/api/tickets/${ticket.id}/status`)
        .set('Authorization', `Bearer ${agentToken1}`)
        .send({ status: TICKET_STATUS.RESOLVED });

      expect(res.statusCode).toBe(422);
      expect(res.body.message).toContain('Invalid status transition');
    });

    it('CUSTOMER PERMISSION: Customer can close their own ticket', async () => {
      const res = await request(app)
        .patch(`/api/tickets/${ticket.id}/status`)
        .set('Authorization', `Bearer ${customerTokenA}`)
        .send({ status: TICKET_STATUS.CLOSED });

      expect(res.statusCode).toBe(200);
      expect(res.body.ticket.status).toBe(TICKET_STATUS.CLOSED);
    });

    it('REOPEN RESTRICTION: Only Administrator can reopen a closed ticket', async () => {
      // Close the ticket
      await request(app)
        .patch(`/api/tickets/${ticket.id}/status`)
        .set('Authorization', `Bearer ${customerTokenA}`)
        .send({ status: TICKET_STATUS.CLOSED });

      // Customer attempts to reopen -> 403
      const custRes = await request(app)
        .patch(`/api/tickets/${ticket.id}/status`)
        .set('Authorization', `Bearer ${customerTokenA}`)
        .send({ status: TICKET_STATUS.OPEN });
      expect(custRes.statusCode).toBe(403);

      // Agent attempts to reopen -> 403
      const agentRes = await request(app)
        .patch(`/api/tickets/${ticket.id}/status`)
        .set('Authorization', `Bearer ${agentToken1}`)
        .send({ status: TICKET_STATUS.OPEN });
      expect(agentRes.statusCode).toBe(403);

      // Admin reopens -> 200 OK
      const adminRes = await request(app)
        .patch(`/api/tickets/${ticket.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: TICKET_STATUS.OPEN });
      expect(adminRes.statusCode).toBe(200);
      expect(adminRes.body.ticket.status).toBe(TICKET_STATUS.OPEN);
    });
  });
});
