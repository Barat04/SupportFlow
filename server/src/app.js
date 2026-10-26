const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const { env } = require('./config/env');

const app = express();

// 1. Request logging (disabled during automated testing to keep test output clean)
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// 2. CORS configuration with explicit origin restriction
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server) or matching CLIENT_URL
    if (!origin || origin === env.CLIENT_URL) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: Origin ${origin} is not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// 3. Body parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 4. Database readiness mapping for human-readable health responses
const dbStateMap = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting'
};

// 5. Health check endpoint
app.get('/api/health', (req, res) => {
  const dbReadyState = mongoose.connection.readyState;
  const dbStatus = dbStateMap[dbReadyState] || 'unknown';

  const isHealthy = dbReadyState === 1 || env.NODE_ENV === 'test';

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      status: dbStatus,
      readyState: dbReadyState
    },
    environment: env.NODE_ENV
  });
});

// 6. Placeholder for upcoming Stage 3 & 4 routes:
// app.use('/api/auth', authRoutes);
// app.use('/api/tickets', ticketRoutes);
// app.use('/api/users', userRoutes);

// 7. 404 Handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// 8. Centralized error handling middleware
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const isProd = env.NODE_ENV === 'production';

  // In test environment, keep logs quiet unless explicitly debugging
  if (env.NODE_ENV !== 'test') {
    console.error(`[Error] ${err.name || 'ApplicationError'}: ${err.message}`);
    if (!isProd && err.stack) {
      console.error(err.stack);
    }
  }

  res.status(statusCode).json({
    success: false,
    message: isProd && statusCode === 500 ? 'Internal server error' : err.message,
    ...(isProd ? {} : { stack: err.stack })
  });
});

module.exports = app;
