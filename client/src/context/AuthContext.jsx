import React, { createContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/authApi';
import { setAuthToken, onUnauthorized } from '../api/client';

export const AuthContext = createContext(null);

/**
 * Authentication Provider.
 * 
 * ARCHITECTURAL RULE:
 * JWT access token and user profile are held STRICTLY in React state memory.
 * They are never saved to localStorage or sessionStorage.
 * On browser reload or tab close, memory is cleared and the user must re-authenticate.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  /**
   * Clears in-memory session.
   */
  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setAuthToken(null);
    setAuthError(null);
  }, []);

  /**
   * Registers a 401 Unauthorized listener on the API client.
   * If any API request returns 401, the session is reset.
   */
  useEffect(() => {
    onUnauthorized(() => {
      logout();
    });

    return () => {
      onUnauthorized(null);
    };
  }, [logout]);

  /**
   * Logs in a user with email and password.
   */
  const login = async (email, password) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const response = await authApi.login({ email, password });
      const { token: receivedToken, user: receivedUser } = response;

      // Save token in memory only
      setToken(receivedToken);
      setUser(receivedUser);
      setAuthToken(receivedToken);

      return response;
    } catch (err) {
      const message = err.message || 'Login failed. Please check your credentials.';
      setAuthError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Registers a new customer account.
   */
  const register = async (name, email, password) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const response = await authApi.register({ name, email, password });
      const { token: receivedToken, user: receivedUser } = response;

      // Save token in memory only
      setToken(receivedToken);
      setUser(receivedUser);
      setAuthToken(receivedToken);

      return response;
    } catch (err) {
      const message = err.message || 'Registration failed. Please review your details.';
      setAuthError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(user && token),
    isLoading,
    authError,
    setAuthError,
    login,
    register,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
