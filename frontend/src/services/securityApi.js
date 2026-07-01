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

// ---------------------------------------------------------------- Password
// PATCH /api/users/password — change password.
// Backend expects the ChangePasswordDto shape: { currentPassword, newPassword }.
export const changePassword = async ({ currentPassword, newPassword }) =>
  apiCall('/api/users/password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
  });

export const isAuthenticated = () => !!getAuthToken();
