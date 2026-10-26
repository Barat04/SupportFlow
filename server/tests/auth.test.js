const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const { connectDB, disconnectDB, mongoose } = require('../src/config/db');
const User = require('../src/models/User');
const { authorizeRoles } = require('../src/middleware/rbac');
const { ROLES } = require('../src/constants/roles');

describe('Authentication & Authorization Suite (/api/auth)', () => {
  let mongoServer;

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
    // Clear users collection before each test to ensure test isolation
    await User.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    it('should register a new customer successfully with 201 status and JWT', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane Customer',
          email: 'jane@example.com',
          password: 'Password123!'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.name).toBe('Jane Customer');
      expect(res.body.user.email).toBe('jane@example.com');
      expect(res.body.user.role).toBe('customer');
      // Critical check: password must NEVER be in the response
      expect(res.body.user.password).toBeUndefined();

      // Check DB directly: password must be hashed, not plaintext
      const dbUser = await User.findOne({ email: 'jane@example.com' }).select('+password');
      expect(dbUser).not.toBeNull();
      expect(dbUser.password).not.toBe('Password123!');
      expect(dbUser.password.startsWith('$2')).toBe(true); // bcrypt hash prefix
    });

    it('SECURITY TEST: must strictly enforce customer role even if request attempts privilege escalation', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Hacker User',
          email: 'hacker@example.com',
          password: 'Password123!',
          role: 'admin' // Attempting to self-promote to admin
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.user.role).toBe('customer'); // Must still be customer

      const dbUser = await User.findOne({ email: 'hacker@example.com' });
      expect(dbUser.role).toBe('customer');
    });

    it('should return 409 Conflict if email is already registered', async () => {
      await User.create({
        name: 'Existing User',
        email: 'duplicate@example.com',
        password: 'Password123!',
        role: 'customer'
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Another User',
          email: 'duplicate@example.com',
          password: 'Password123!'
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });

    it('should return 400 Bad Request with field errors when input is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: '',
          email: 'not-an-email',
          password: 'short'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create user for login tests
      await User.create({
        name: 'Valid User',
        email: 'user@example.com',
        password: 'ValidPassword123!',
        role: 'customer'
      });
    });

    it('should authenticate successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'ValidPassword123!'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe('user@example.com');
      expect(res.body.user.password).toBeUndefined();
    });

    it('should return 401 with generic message for incorrect password (anti-enumeration)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'WrongPassword!'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('should return 401 with identical message for non-existent email (anti-enumeration)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password');
    });
  });

  describe('GET /api/auth/me (Protected Route)', () => {
    let customerToken;
    let customerUser;

    beforeEach(async () => {
      customerUser = await User.create({
        name: 'Active Customer',
        email: 'active@example.com',
        password: 'Password123!',
        role: 'customer'
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'active@example.com',
          password: 'Password123!'
        });

      customerToken = loginRes.body.token;
    });

    it('should return current user profile with valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe('active@example.com');
      expect(res.body.user.name).toBe('Active Customer');
      expect(res.body.user.password).toBeUndefined();
    });

    it('should return 401 when Authorization header is missing', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Authentication token missing');
    });

    it('should return 401 when token is invalid or forged', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_forged_token');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid authentication token');
    });
  });

  describe('RBAC Middleware unit behavior', () => {
    it('should permit access when user has matching role', () => {
      const middleware = authorizeRoles(ROLES.AGENT, ROLES.ADMIN);
      const req = { user: { role: ROLES.AGENT } };
      const res = {};
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalledWith(); // Called with no error argument
    });

    it('should pass ForbiddenError to next() when user does not have required role', () => {
      const middleware = authorizeRoles(ROLES.ADMIN);
      const req = { user: { role: ROLES.CUSTOMER } };
      const res = {};
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
      const errorPassed = next.mock.calls[0][0];
      expect(errorPassed.statusCode).toBe(403);
      expect(errorPassed.message).toContain('Access denied');
    });
  });
});
