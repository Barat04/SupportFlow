const request = require('supertest');
const app = require('../src/app');

describe('Server Foundation & Health API Endpoints', () => {
  it('GET /api/health should respond with status 200 and health diagnostic fields', async () => {
    const res = await request(app).get('/api/health');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('status', 'healthy');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('database');
    expect(res.body.database).toHaveProperty('status');
    expect(res.body.database).toHaveProperty('readyState');
    expect(res.body).toHaveProperty('environment');
  });

  it('GET /api/nonexistent-route should respond with 404 and structured error payload', async () => {
    const res = await request(app).get('/api/nonexistent-route');

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.message).toContain('Endpoint not found: GET /api/nonexistent-route');
  });
});
