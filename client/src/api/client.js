/**
 * Reusable fetch-based HTTP API Client.
 * Automatically injects credentials: 'include' for HTTP-only cookie authentication.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export async function apiClient(endpoint, options = {}) {
  const { method = 'GET', body, headers = {}, ...rest } = options;

  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    credentials: 'include', // Ensure JWT cookies are transmitted
    ...rest,
  };

  if (body !== undefined) {
    config.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const response = await fetch(url, config);
    const contentType = response.headers.get('content-type');
    let data = null;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMessage =
        (typeof data === 'object' && data?.message) ||
        (typeof data === 'string' && data) ||
        `Request failed with status ${response.status}`;

      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    if (error.status) throw error;

    // Network or parse error
    const netError = new Error(
      error.message || 'Unable to connect to the server. Please check your connection.'
    );
    netError.status = 0;
    throw netError;
  }
}
