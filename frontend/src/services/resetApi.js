import { API_URL } from '@/config/api';

// ---------------------------------------------------------------- auth helper
const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken') || localStorage.getItem('token');
  }
  return null;
};

// Shared fetch wrapper following the api.js convention (token auto-attached,
// JSON body, throw on !ok). Kept local so we never modify api.js.
const apiCall = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }
  return response.json();
};

// ---------------------------------------------------------------- Password reset
// Stage 1 — Forgot: request a reset link be emailed.
// POST /api/users/password/reset-request { email }
export const requestPasswordReset = async (email) =>
  apiCall('/api/users/password/reset-request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

// Stage 2 — Set new: submit the new password (token usually carried via the
// emailed link query string, passed through here when present).
// POST /api/users/password/reset { token?, email?, password }
export const submitPasswordReset = async ({ token, email, password }) =>
  apiCall('/api/users/password/reset', {
    method: 'POST',
    body: JSON.stringify({ token, email, password }),
  });
