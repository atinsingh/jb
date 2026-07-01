// Service helpers for the Job detail screen (App Job.dc.html -> /app/job).
// Follows the same fetch/auth/error convention as src/services/api.js, but
// targets the CORRECT backend paths. Job matching lives under /api/matching
// (api.js still points at the stale /api/job-matching/* routes). This is a
// NEW file — existing api.js is left untouched.

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

// GET /api/jobs/scraper/:jobId -> the scraped job document
export const getScrapedJobById = async (jobId) => {
  return apiCall(`/api/jobs/scraper/${jobId}`);
};

// POST /api/matching/calculate/:jobId -> { match } (score + matched/missing skills)
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
