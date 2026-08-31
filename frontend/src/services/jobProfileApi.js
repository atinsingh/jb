// Service helpers for Job Profiles (/app/job-profiles).
//
// A job profile is one targeted search: a role, the countries it targets, its
// own match threshold, its own résumé, and its own auto-apply switch. A
// candidate can run several at once ("Backend — Canada", "Staff SWE — remote").
//
// The backend surface (backend/src/job-profiles/job-profiles.controller.ts) has
// existed for a long time with no frontend caller at all — this file is that
// caller. Follows the same fetch/auth/error convention as services/savedApi.js.

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
    // class-validator returns `message` as an array of per-field failures.
    const detail = Array.isArray(error.message) ? error.message.join(', ') : error.message;
    throw new Error(detail || 'Request failed');
  }

  return response.json();
};

// GET /api/job-profiles -> every profile the candidate owns
export const listJobProfiles = async () => apiCall('/api/job-profiles');

// GET /api/job-profiles/active -> only the profiles currently running
export const getActiveJobProfiles = async () => apiCall('/api/job-profiles/active');

// GET /api/job-profiles/stats
export const getJobProfileStats = async () => apiCall('/api/job-profiles/stats');

// GET /api/job-profiles/:id
export const getJobProfile = async (id) => apiCall(`/api/job-profiles/${id}`);

// POST /api/job-profiles
//   { profileName, role, level, location, jobType, salaryMin, salaryMax,
//     skills[], preferredLocations[], targetCountries[], minMatchScore, autoApply }
export const createJobProfile = async (payload) =>
  apiCall('/api/job-profiles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// PATCH /api/job-profiles/:id
export const updateJobProfile = async (id, payload) =>
  apiCall(`/api/job-profiles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

// PATCH /api/job-profiles/:id/activate  { active: boolean }
export const setJobProfileActive = async (id, active) =>
  apiCall(`/api/job-profiles/${id}/activate`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });

// DELETE /api/job-profiles/:id
export const deleteJobProfile = async (id) =>
  apiCall(`/api/job-profiles/${id}`, { method: 'DELETE' });

// POST /api/job-profiles/:id/resume — multipart, so it bypasses the JSON helper.
export const uploadJobProfileResume = async (id, file) => {
  const token = await getAccessToken();
  const form = new FormData();
  form.append('resume', file);

  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // Content-Type is intentionally omitted: the browser must set the multipart
  // boundary itself.

  const response = await fetch(`${API_URL}/api/job-profiles/${id}/resume`, {
    method: 'POST',
    headers,
    body: form,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Upload failed' }));
    throw new Error(error.message || 'Upload failed');
  }

  return response.json();
};

// GET /api/matching/preview?profileId= -> real counts explaining what a profile
// does to the pool ("412 jobs, 0 in your target countries").
export const getMatchPreviewForProfile = async (profileId) => {
  const qs = profileId ? `?profileId=${encodeURIComponent(profileId)}` : '';
  return apiCall(`/api/matching/preview${qs}`);
};
