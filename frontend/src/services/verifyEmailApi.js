import { API_URL } from '@/config/api';

// Helper function to get auth token (mirrors services/api.js pattern)
const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken') || localStorage.getItem('token');
  }
  return null;
};

// Helper function for API calls (mirrors services/api.js pattern)
const apiCall = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
};

// Returns the signed-in user's email (used to personalize the verify screen).
// Backend: /api/users — graceful fallback handled by the caller.
export const getVerifyTarget = async () => {
  return apiCall('/api/users/profile');
};

// Submit a 6-digit verification code.
// Sample / no live endpoint — caller falls back to demo behavior on failure.
export const submitVerificationCode = async (code) => {
  return apiCall('/api/users/verify-email', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
};

// Resend the verification code to the user's email.
// Sample / no live endpoint — caller falls back to a local cooldown on failure.
export const resendVerificationCode = async () => {
  return apiCall('/api/users/verify-email/resend', {
    method: 'POST',
  });
};
