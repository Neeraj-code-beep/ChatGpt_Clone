import { apiClient } from './client';

/**
 * Authentication API Service
 * Handles user registration, login, session hydration, and logout.
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

export async function getMe() {
  return apiClient('/api/auth/me', {
    method: 'GET',
  });
}

export async function logoutUser() {
  return apiClient('/api/auth/logout', {
    method: 'POST',
  });
}
