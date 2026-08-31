import { API_URL } from '@/config/api';
import { getAccessToken } from '@/lib/apiClient';

// Core fetch wrapper (mirrors services/api.js apiCall convention)
const apiCall = async (endpoint, options = {}) => {
  const token = await getAccessToken();
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

// User Preferences (path-correct against backend /api/users/preferences)
export const getUserPreferences = async () => {
  return apiCall('/api/users/preferences');
};

export const updateUserPreferences = async (prefs) => {
  return apiCall('/api/users/preferences', {
    method: 'PUT',
    body: JSON.stringify(prefs),
  });
};

// Apply Runner (path-correct stub runner /api/apply-runner/process)
export const processApplyRunner = async (limit = 10) => {
  return apiCall('/api/apply-runner/process', {
    method: 'POST',
    body: JSON.stringify({ limit }),
  });
};

// Queue an application — FIXED path: backend is /api/applications/queue/:jobId
export const queueApplication = async (jobId) => {
  return apiCall(`/api/applications/queue/${jobId}`, {
    method: 'POST',
  });
};

// My applications — FIXED path: backend is /api/applications/my-applications
export const getMyApplications = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.skip) params.append('skip', filters.skip);
  const qs = params.toString();
  return apiCall(`/api/applications/my-applications${qs ? `?${qs}` : ''}`);
};
