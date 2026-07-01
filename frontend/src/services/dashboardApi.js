import { API_URL } from '@/config/api';

// Mirrors the apiCall convention in services/api.js (token auto-attached,
// JSON headers, throws on non-2xx). These helpers point at the CORRECT
// backend paths (the originals in api.js use stale /api/job-matching and
// /api/application-agent prefixes). New file — nothing existing is modified.

const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken') || localStorage.getItem('token');
  }
  return null;
};

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

// GET /api/matching/matches?minScore -> { matches, total }
export const getMyMatches = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.minScore != null) params.append('minScore', filters.minScore);
  const qs = params.toString();
  return apiCall(`/api/matching/matches${qs ? `?${qs}` : ''}`);
};

// GET /api/matching/recommendations?minScore -> { recommendations, total }
export const getJobRecommendations = async (minScore) => {
  const params = new URLSearchParams();
  if (minScore != null) params.append('minScore', minScore);
  const qs = params.toString();
  return apiCall(`/api/matching/recommendations${qs ? `?${qs}` : ''}`);
};

// GET /api/applications/my-applications?status&limit&skip -> { applications, total }
export const getMyApplications = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.skip) params.append('skip', filters.skip);
  const qs = params.toString();
  return apiCall(`/api/applications/my-applications${qs ? `?${qs}` : ''}`);
};

// GET /api/users/preferences -> { preferences }
export const getUserPreferences = async () => {
  return apiCall('/api/users/preferences');
};
