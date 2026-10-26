import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * Custom hook to access authentication context.
 * 
 * @returns {{
 *   user: Object|null,
 *   token: string|null,
 *   isAuthenticated: boolean,
 *   isLoading: boolean,
 *   authError: string|null,
 *   login: (email: string, password: string) => Promise<any>,
 *   register: (name: string, email: string, password: string) => Promise<any>,
 *   logout: () => void,
 *   setAuthError: (err: string|null) => void
 * }}
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
