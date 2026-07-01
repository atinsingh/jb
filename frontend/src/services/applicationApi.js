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

  const text = await response.text();
  return text ? JSON.parse(text) : {};
};

/* -------------------------------------------------------------------------- */
/* Application detail — corrected backend paths (/api/applications/*).         */
/* services/api.js still points at the stale /api/application-agent prefix;    */
/* these use the live routes the backend actually serves.                      */
/* -------------------------------------------------------------------------- */

// GET /api/applications/:id -> one application (ownership-checked)
export const getApplicationById = async (applicationId) => {
  return apiCall(`/api/applications/${applicationId}`);
};

// GET /api/applications/activity?since&limit&skip&type -> { events, total }
// When applicationId is passed, scopes activity to that application.
export const getApplicationActivity = async (params = {}) => {
  const search = new URLSearchParams();
  if (params.applicationId) search.append('applicationId', params.applicationId);
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
