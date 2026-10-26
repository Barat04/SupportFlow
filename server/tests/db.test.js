const { MongoMemoryServer } = require('mongodb-memory-server');
const { connectDB, disconnectDB, mongoose } = require('../src/config/db');

describe('Database Connection & Lifecycle', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await disconnectDB();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it('should connect successfully to a valid MongoDB URI', async () => {
    const uri = mongoServer.getUri();
    const conn = await connectDB(uri);

    expect(conn.connection.readyState).toBe(1); // 1 = connected
  });

  it('should disconnect cleanly via disconnectDB()', async () => {
    await disconnectDB();
    expect(mongoose.connection.readyState).toBe(0); // 0 = disconnected
  });

  it('should throw an error when connecting to an invalid URI with immediate failure', async () => {
    // Port 1 is universally rejected/unreachable quickly
    const invalidUri = 'mongodb://127.0.0.1:1/invalid_db?serverSelectionTimeoutMS=1000';

    await expect(connectDB(invalidUri)).rejects.toThrow();
  });
});
