// Service helpers for the Job Matches screen.
// These follow the same fetch/auth/error convention as src/services/api.js
// but target the CORRECT backend paths (the existing api.js helpers point at
// stale `/api/job-matching/*` routes; the backend uses `/api/matching/*`).
// This is a NEW file — existing api.js is left untouched.

import { API_URL } from '@/config/api';

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
export const getMyMatches = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.minScore != null) params.append('minScore', filters.minScore);
  const qs = params.toString();
  return apiCall(`/api/matching/matches${qs ? `?${qs}` : ''}`);
};

// POST /api/matching/calculate/:jobId -> { match }
export const calculateJobMatch = async (jobId) => {
  return apiCall(`/api/matching/calculate/${jobId}`, { method: 'POST' });
};

// PATCH /api/matching/interest/:jobId  body { isInterested } -> { match }
export const markJobAsInterested = async (jobId, isInterested) => {
  return apiCall(`/api/matching/interest/${jobId}`, {
    method: 'PATCH',
    body: JSON.stringify({ isInterested }),
  });
};

// GET /api/matching/recommendations?minScore= -> { recommendations, total }
export const getJobRecommendations = async (minScore) => {
  const params = new URLSearchParams();
  if (minScore != null) params.append('minScore', minScore);
  const qs = params.toString();
  return apiCall(`/api/matching/recommendations${qs ? `?${qs}` : ''}`);
};
