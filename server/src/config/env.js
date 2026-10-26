const dotenv = require('dotenv');
const path = require('path');

// Load .env from server root directory if not already loaded
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Validates and exports application environment variables.
 * Fails fast with clear descriptive error messages if required variables are missing.
 */
function validateEnv() {
  const requiredEnvVars = [
    'MONGODB_URI'
  ];

  // In production, enforce JWT_SECRET requirement
  if (process.env.NODE_ENV === 'production') {
    requiredEnvVars.push('JWT_SECRET');
  }

  const missing = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `[Startup Error] Missing required environment variable(s): ${missing.join(', ')}.\n` +
      `Please check your server/.env file or consult server/.env.example.`
    );
  }

  return {
    PORT: parseInt(process.env.PORT, 10) || 5001,
    NODE_ENV: process.env.NODE_ENV || 'development',
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/supportflow',
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
    JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_fallback_for_local_testing_only',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d'
  };
}

const env = validateEnv();

module.exports = {
  env,
  validateEnv
};
