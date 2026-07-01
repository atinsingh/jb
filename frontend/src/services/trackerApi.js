import { API_URL } from '@/config/api';

// Helper to read the auth token (mirrors services/api.js convention)
const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken') || localStorage.getItem('token');
  }
  return null;
};

// Core fetch wrapper — attaches bearer token, parses JSON, throws on !ok
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

  // Some endpoints (e.g. DELETE) may return empty bodies
  const text = await response.text();
  return text ? JSON.parse(text) : {};
};

/* -------------------------------------------------------------------------- */
/* Applications pipeline — corrected backend paths (/api/applications/*)        */
/* The helpers in services/api.js point at the stale /api/application-agent     */
/* prefix; these use the live routes confirmed against the backend.            */
/* -------------------------------------------------------------------------- */

// GET /api/applications/my-applications?status&limit&skip -> { applications, total }
export const getMyApplications = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.skip) params.append('skip', filters.skip);
  const qs = params.toString();
  return apiCall(`/api/applications/my-applications${qs ? `?${qs}` : ''}`);
};

// GET /api/applications/:id -> one application (ownership-checked)
export const getApplicationById = async (applicationId) => {
  return apiCall(`/api/applications/${applicationId}`);
};

// PATCH /api/applications/:id/status -> retry by re-queuing.
// The backend has no dedicated retry route; the closest live action is a
// status update back into the processing pipeline.
export const retryApplication = async (applicationId) => {
  return apiCall(`/api/applications/${applicationId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'QUEUED' }),
  });
};

// DELETE /api/applications/:id -> cancel / remove an application
export const cancelApplication = async (applicationId) => {
  return apiCall(`/api/applications/${applicationId}`, {
    method: 'DELETE',
  });
};

// GET /api/applications/activity?since&limit&skip&type -> { events, total }
export const getApplicationActivity = async (params = {}) => {
  const search = new URLSearchParams();
  if (params.since) search.append('since', params.since);
  if (params.limit) search.append('limit', params.limit);
  if (params.skip) search.append('skip', params.skip);
  if (params.type) {
    if (Array.isArray(params.type)) {
      params.type.forEach((t) => search.append('type', t));
    } else {
      search.append('type', params.type);
    }
  }
  const qs = search.toString();
  return apiCall(`/api/applications/activity${qs ? `?${qs}` : ''}`);
};
