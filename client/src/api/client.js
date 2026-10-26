/**
 * Centralized API Client with In-Memory Bearer Token Management.
 * 
 * In accordance with our security architecture:
 * The JWT access token is stored strictly in JavaScript memory (AuthContext).
 * It is never persisted in localStorage or sessionStorage.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

let inMemoryToken = null;
let unauthorizedHandler = null;

/**
 * Updates the in-memory access token.
 * 
 * @param {string|null} token 
 */
export function setAuthToken(token) {
  inMemoryToken = token;
}

/**
 * Returns the active in-memory access token.
 * 
 * @returns {string|null}
 */
export function getAuthToken() {
  return inMemoryToken;
}

/**
 * Registers a callback invoked whenever the backend returns a 401 Unauthorized response.
 * Typically used by AuthContext to reset state upon session expiry.
 * 
 * @param {Function} handler 
 */
export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

/**
 * Core HTTP request runner.
 * 
 * @param {string} endpoint - Path relative to BASE_URL (e.g. '/auth/login')
 * @param {Object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<any>} Parsed JSON response
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (inMemoryToken) {
    headers['Authorization'] = `Bearer ${inMemoryToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  // Handle 401 Unauthorized specifically (token expired or revoked)
  if (response.status === 401) {
    if (unauthorizedHandler) {
      unauthorizedHandler();
    }
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = { success: false, message: 'Invalid server response' };
  }

  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.statusCode = response.status;
    error.errors = data.errors || [];
    error.data = data;
    throw error;
  }

  return data;
}

// Convenient HTTP method wrappers
export const api = {
  get: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) =>
    apiRequest(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  patch: (endpoint, body, options) =>
    apiRequest(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'DELETE' })
};
