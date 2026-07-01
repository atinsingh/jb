// Service helpers for the Saved Jobs screen.
// Follows the same fetch/auth/error convention as src/services/api.js but
// targets the CORRECT backend paths. The backend exposes the matching surface
// under `/api/matching/*` (api.js has some stale `/api/job-matching/*` paths).
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

// GET /api/matching/interested -> the jobs the candidate marked as interested
// (i.e. their saved / bookmarked roles). Shape is tolerated flexibly by the
// page (array, { interested }, { matches }, etc.).
export const getInterestedJobs = async () => {
  return apiCall('/api/matching/interested');
};

// PATCH /api/matching/interest/:jobId  body { isInterested } -> { match }
// Used to un-save (remove) a role from the saved collection.
export const markJobAsInterested = async (jobId, isInterested) => {
  return apiCall(`/api/matching/interest/${jobId}`, {
    method: 'PATCH',
    body: JSON.stringify({ isInterested }),
  });
};
