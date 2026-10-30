/**
 * AuthContext — manages real authentication state
 *
 * Wraps the app so any component can access:
 *   { user, token, loading, login, register, logout, isAuthenticated }
 *
 * On mount: verifies stored token with the backend.
 * On login/register: stores token and user object.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth as authApi, setToken, clearToken } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true); // true while verifying token on mount

  /** Verify stored token on first load */
  useEffect(() => {
    const token = localStorage.getItem('interviewiq_token');
    if (!token) { setLoading(false); return; }

    authApi.me()
      .then(({ user }) => setUser(user))
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (name, email, password, autoLogin = false) => {
    const data = await authApi.register(name, email, password);
    if (autoLogin) {
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
