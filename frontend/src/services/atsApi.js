import { API_URL } from '@/config/api';
import { getAccessToken } from '@/lib/apiClient';

// This module deliberately exposes two independent ATS concepts. `checkAts`
// and `matchAts` serve stored Resume documents; the session functions below
// run Resume-Matcher against generated ResumeHarnessSession revisions.

const apiCall = async (endpoint, options = {}) => {
  const token = await getAccessToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    const error = new Error(detail || 'ATS request failed');
    error.status = response.status;
    throw error;
  }
  // Nest/Express serializes a `null` controller result as an empty successful
  // response. For the latest-result endpoint that means this résumé revision
  // has not been analyzed yet; it is not an ATS outage.
  const text = await response.text();
  return text.trim() ? JSON.parse(text) : null;
};

export const getLatestAtsSession = (resumeSessionId) =>
  apiCall(`/api/ats/resume-sessions/${resumeSessionId}/latest`);

export const startAtsSession = (payload) =>
  apiCall('/api/ats/sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const runAtsSession = (id) =>
  apiCall(`/api/ats/sessions/${id}/run`, { method: 'POST' });

export const checkAts = (resumeId) =>
  apiCall(`/api/resume-builder/${resumeId}/ats-check`, { method: 'POST' });

export const matchAts = (resumeId, jobDescription) =>
  apiCall(`/api/resume-builder/${resumeId}/ats-match`, {
    method: 'POST',
    body: JSON.stringify({ jobDescription }),
  });
