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

// ---------------------------------------------------------------- Users
// GET /api/users/profile — current user profile
export const getUserProfile = async () => apiCall('/api/users/profile');

// PATCH /api/users/profile — update profile (UpdateProfileDto)
export const updateUserProfile = async (profile) =>
  apiCall('/api/users/profile', {
    method: 'PATCH',
    body: JSON.stringify(profile),
  });

// POST /api/users/profile/picture — multipart `picture`
export const uploadProfilePicture = async (file) => {
  const token = getAuthToken();
  const formData = new FormData();
  formData.append('picture', file);

  const response = await fetch(`${API_URL}/api/users/profile/picture`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Upload failed' }));
    throw new Error(error.message || 'Upload failed');
  }
  return response.json();
};

// PATCH /api/users/email — { newEmail, password }
export const updateUserEmail = async (newEmail, password) =>
  apiCall('/api/users/email', {
    method: 'PATCH',
    body: JSON.stringify({ newEmail, password }),
  });

// PATCH /api/users/password — change password (ChangePasswordDto)
export const changeUserPassword = async (payload) =>
  apiCall('/api/users/password', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

// ---------------------------------------------------------------- Entitlements
// GET /api/entitlements — { planType, entitlements }
export const getEntitlements = async () => apiCall('/api/entitlements');

// GET /api/entitlements/plans/:planType — plan entitlements (FREE|PRO|ELITE|INTERVIEW)
export const getPlanEntitlements = async (planType) =>
  apiCall(`/api/entitlements/plans/${planType}`);
