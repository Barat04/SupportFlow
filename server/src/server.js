const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db');
const { env } = require('./config/env');

async function startServer() {
  try {
    // 1. Establish database connection before accepting HTTP traffic
    await connectDB();

    // 2. Start HTTP listener
    const server = app.listen(env.PORT, () => {
      console.log(`[SupportFlow Server] Running in ${env.NODE_ENV} mode on port ${env.PORT}`);
      console.log(`[SupportFlow Server] Health check available at: http://localhost:${env.PORT}/api/health`);
    });

    // 3. Graceful shutdown handler for production process managers (Docker, PM2, Kubernetes)
    const handleShutdown = async (signal) => {
      console.log(`\n[SupportFlow Server] Received ${signal}. Closing HTTP server and database connections...`);
      server.close(async () => {
        console.log('[SupportFlow Server] HTTP server closed.');
        try {
          await disconnectDB();
          console.log('[SupportFlow Server] Shutdown complete.');
          process.exit(0);
        } catch (err) {
          console.error('[SupportFlow Server] Error during shutdown:', err);
          process.exit(1);
        }
      });
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  } catch (error) {
    console.error(`[SupportFlow Server Startup Failure]: ${error.message}`);
    process.exit(1);
  }
}

// Only start the server if executed directly (e.g. `node src/server.js`)
if (require.main === module) {
  startServer();
}

module.exports = { startServer };
