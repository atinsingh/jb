// Service helpers for the Company profile screen.
// There is no dedicated company-profile endpoint on the backend, so this
// module reuses the matching surface to enrich the "Open roles" list when the
// user is authenticated. It follows the same fetch/auth/error convention as
// src/services/api.js but targets the CORRECT backend path (`/api/matching/*`).
// This is a NEW file — existing api.js is left untouched.

import { API_URL } from '@/config/api';
import { getAccessToken } from '@/lib/apiClient';

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

// GET /api/matching/matches?minScore= -> { matches, total }
// Used to surface roles matched to the current user. The Company screen filters
// these client-side to roles at the profiled company when possible.
export const getCompanyMatches = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.minScore != null) params.append('minScore', filters.minScore);
  const qs = params.toString();
  return apiCall(`/api/matching/matches${qs ? `?${qs}` : ''}`);
};
