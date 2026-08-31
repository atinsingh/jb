import { API_URL } from '@/config/api';
import { getAccessToken } from '@/lib/apiClient';

// Shared fetch wrapper following the api.js convention (token auto-attached,
// JSON body, throw on !ok). Kept local so we never modify api.js.
const apiCall = async (endpoint, options = {}) => {
  const token = await getAccessToken();
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

// ---------------------------------------------------------------- Résumé parse
// POST /api/resume/parse — multipart `resume`. Returns parsed experience,
// skills and education extracted from the uploaded file.
export const uploadResume = async (file) => {
  const token = await getAccessToken();
  const formData = new FormData();
  formData.append('resume', file);

  const response = await fetch(`${API_URL}/api/resume/parse`, {
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

// ---------------------------------------------------------------- Profile
// GET /api/users/profile — current user profile.
export const getUserProfile = async () => apiCall('/api/users/profile');

// PATCH /api/users/profile — confirm/update the parsed profile.
export const updateProfile = async (profile) =>
  apiCall('/api/users/profile', {
    method: 'PATCH',
    body: JSON.stringify(profile),
  });

// ---------------------------------------------------------------- Preferences
// GET /api/users/preferences — saved job-search preferences.
export const getUserPreferences = async () => apiCall('/api/users/preferences');

// PUT /api/users/preferences — target roles, locations, salary, auto-apply.
export const updateUserPreferences = async (prefs) =>
  apiCall('/api/users/preferences', {
    method: 'PUT',
    body: JSON.stringify(prefs),
  });
