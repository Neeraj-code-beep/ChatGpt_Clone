import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  loginUser as apiLogin,
  registerUser as apiRegister,
  getMe as apiGetMe,
  logoutUser as apiLogout,
} from '../api/auth.api';
import { disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

const STORAGE_KEY = 'nexa_session_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const cached = sessionStorage.getItem(STORAGE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Helper to normalize user shape from server responses.
   */
  const normalizeUser = useCallback((rawUser) => {
    if (!rawUser) return null;
    const fullNameObj = rawUser.fullName || rawUser.fullname || {};
    const firstName = fullNameObj.firstName || rawUser.firstName || 'User';
    const lastName = fullNameObj.lastName || rawUser.lastName || '';

    return {
      id: rawUser._id || rawUser.id,
      email: rawUser.email,
      fullName: {
        firstName,
        lastName,
      },
      displayName: `${firstName} ${lastName}`.trim() || rawUser.email,
    };
  }, []);

  // Hydrate session on initial mount via GET /api/auth/me
  useEffect(() => {
    let isMounted = true;

    async function hydrateSession() {
      try {
        const response = await apiGetMe();
        if (isMounted && response?.user) {
          const normalized = normalizeUser(response.user);
          setUser(normalized);
        }
      } catch {
        // Unauthenticated or network error on cold reload
        if (isMounted) {
          setUser(null);
          sessionStorage.removeItem(STORAGE_KEY);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    hydrateSession();

    return () => {
      isMounted = false;
    };
  }, [normalizeUser]);

  // Sync user metadata to session storage
  useEffect(() => {
    try {
      if (user) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors in private browsing
    }
  }, [user]);

  const login = useCallback(async ({ email, password }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiLogin({ email, password });
      const normalized = normalizeUser(response.user);
      setUser(normalized);
      return { success: true, user: normalized };
    } catch (err) {
      const message = err.message || 'Login failed. Please check your credentials.';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [normalizeUser]);

  const register = useCallback(async ({ firstName, lastName, email, password }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiRegister({ firstName, lastName, email, password });
      const normalized = normalizeUser(response.user);
      setUser(normalized);
      return { success: true, user: normalized };
    } catch (err) {
      const message = err.message || 'Registration failed. Please try again.';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [normalizeUser]);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Ignore logout API error
    } finally {
      disconnectSocket();
      setUser(null);
      setError(null);
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        register,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
