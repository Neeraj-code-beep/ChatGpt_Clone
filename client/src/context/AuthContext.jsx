import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser as apiLogin, registerUser as apiRegister } from '../api/auth.api';

const AuthContext = createContext(null);

const STORAGE_KEY = 'helper_session_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const cached = sessionStorage.getItem(STORAGE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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

  /**
   * Helper to normalize user shape from login/register responses.
   * Note: register returns { fullname }, login returns { fullName }.
   */
  const normalizeUser = (rawUser) => {
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
  };

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
  }, []);

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
  }, []);

  const logout = useCallback(() => {
    // Note: Backend currently does not provide POST /api/auth/logout.
    // We clear frontend session state. Once the backend endpoint is added,
    // this will invoke apiLogout() to clear the HTTP-only cookie.
    setUser(null);
    setError(null);
    sessionStorage.removeItem(STORAGE_KEY);
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
