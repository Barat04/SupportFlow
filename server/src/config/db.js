const mongoose = require('mongoose');
const { env } = require('./env');

/**
 * Connects to MongoDB using Mongoose.
 * 
 * @param {string} [customUri] - Optional URI override (primarily used in tests)
 * @returns {Promise<mongoose.Connection>}
 */
async function connectDB(customUri) {
  const uri = customUri || env.MONGODB_URI;

  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: env.NODE_ENV !== 'production' // Build indexes automatically in dev/test, manage explicitly in prod
    });

    if (env.NODE_ENV !== 'test') {
      console.log(`[Database] MongoDB Connected successfully to: ${conn.connection.host}/${conn.connection.name}`);
    }

    return conn;
  } catch (error) {
    if (env.NODE_ENV !== 'test') {
      console.error(`[Database Error] Failed to connect to MongoDB at ${uri}`);
      console.error(`Reason: ${error.message}`);
    }
    // Rethrow error so callers (e.g. server.js or test harnesses) can handle failure appropriately
    throw error;
  }
}

/**
 * Closes the active MongoDB connection gracefully.
 * Used during process shutdown and test teardowns.
 */
async function disconnectDB() {
  try {
    await mongoose.connection.close();
    if (env.NODE_ENV !== 'test') {
      console.log('[Database] MongoDB connection closed gracefully.');
    }
  } catch (error) {
    console.error(`[Database Error] Error during MongoDB disconnect: ${error.message}`);
    throw error;
  }
}

// Connection event monitoring
mongoose.connection.on('error', (err) => {
  if (env.NODE_ENV !== 'test') {
    console.error(`[Database] Mongoose connection error: ${err.message}`);
  }
});

mongoose.connection.on('disconnected', () => {
  if (env.NODE_ENV !== 'test') {
    console.warn('[Database] Mongoose connection disconnected.');
  }
});

module.exports = {
  connectDB,
  disconnectDB,
  mongoose
};
