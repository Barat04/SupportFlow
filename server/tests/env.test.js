const { validateEnv } = require('../src/config/env');

describe('Environment Configuration & Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should successfully validate with required environment variables', () => {
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/test_db';
    process.env.PORT = '5001';
    process.env.NODE_ENV = 'test';

    const config = validateEnv();

    expect(config.PORT).toBe(5001);
    expect(config.NODE_ENV).toBe('test');
    expect(config.MONGODB_URI).toBe('mongodb://127.0.0.1:27017/test_db');
  });

  it('should throw descriptive error when MONGODB_URI is missing', () => {
    delete process.env.MONGODB_URI;

    expect(() => validateEnv()).toThrow(/Missing required environment variable/);
  });

  it('should enforce JWT_SECRET requirement in production mode', () => {
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/prod_db';
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;

    expect(() => validateEnv()).toThrow(/JWT_SECRET/);
  });
});
