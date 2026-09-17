import { apiClient } from './client';

/**
 * Authentication API Service
 * Handles user registration and login.
 * Note: Session persistence relies on the HTTP-only JWT cookie set by the server.
 */

export async function registerUser({ firstName, lastName, email, password }) {
  return apiClient('/api/auth/register', {
    method: 'POST',
    body: {
      fullName: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      },
      email: email.trim().toLowerCase(),
      password,
    },
  });
}

export async function loginUser({ email, password }) {
  return apiClient('/api/auth/login', {
    method: 'POST',
    body: {
      email: email.trim().toLowerCase(),
      password,
    },
  });
}

/**
 * Backend Integration Note:
 * The following endpoints are currently NOT exposed by the backend:
 * - GET /api/auth/me (User session hydration)
 * - POST /api/auth/logout (Cookie invalidation)
 * These will be wired here once implemented on the backend.
 */
