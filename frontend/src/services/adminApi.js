import { API_URL } from '@/config/api';

/**
 * Admin API client (operator console).
 *
 * Talks to the admin NestJS module (`/api/admin/*`, ROLE_ADMIN). Same
 * convention as the employer/candidate service modules: JWT auto-attached from
 * localStorage, JSON headers, throws on non-2xx. Callers must surface the error
 * (loading / empty / error states) — never fall back to fabricated sample data.
 */

const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken') || localStorage.getItem('token');
  }
  return null;
};

const apiCall = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: 'Request failed' }));
    const message = Array.isArray(error.message)
      ? error.message.join(', ')
      : error.message || 'Request failed';
    throw new Error(message);
  }

  // 204 / empty body tolerance
  const text = await response.text();
  return text ? JSON.parse(text) : {};
};

const qs = (params = {}) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') sp.append(k, v);
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
};

/* ------------------------------------------------------------------ users --- */
export const adminUsersApi = {
  // GET /api/admin/users?role&q&plan&isActive&page&limit -> { users, total, page, limit }
  list: (filters = {}) => apiCall(`/api/admin/users${qs(filters)}`),
  // GET /api/admin/users/:id
  get: (id) => apiCall(`/api/admin/users/${id}`),
  // PATCH /api/admin/users/:id/role { role }
  setRole: (id, role) =>
    apiCall(`/api/admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  // PATCH /api/admin/users/:id/suspend { reason? }
  suspend: (id, reason) =>
    apiCall(`/api/admin/users/${id}/suspend`, {
      method: 'PATCH',
      body: JSON.stringify(reason ? { reason } : {}),
    }),
  // PATCH /api/admin/users/:id/reactivate
  reactivate: (id) =>
    apiCall(`/api/admin/users/${id}/reactivate`, { method: 'PATCH' }),
  // POST /api/admin/users/:id/password-reset
  passwordReset: (id) =>
    apiCall(`/api/admin/users/${id}/password-reset`, { method: 'POST' }),
};

/* ---------------------------------------------------------------- metrics --- */
export const adminMetricsApi = {
  // GET /api/admin/metrics -> { users, jobs, applications, employers, candidates, ingestion }
  get: () => apiCall('/api/admin/metrics'),
};

/* ------------------------------------------------------------------- jobs --- */
export const adminJobsApi = {
  // GET /api/admin/jobs?lifecycle&moderationStatus&q&page&limit -> { jobs, total }
  list: (filters = {}) => apiCall(`/api/admin/jobs${qs(filters)}`),
  // PATCH /api/admin/jobs/:id/moderation { moderationStatus }
  setModeration: (id, moderationStatus) =>
    apiCall(`/api/admin/jobs/${id}/moderation`, {
      method: 'PATCH',
      body: JSON.stringify({ moderationStatus }),
    }),
  // PATCH /api/admin/jobs/:id/lifecycle { lifecycle }
  setLifecycle: (id, lifecycle) =>
    apiCall(`/api/admin/jobs/${id}/lifecycle`, {
      method: 'PATCH',
      body: JSON.stringify({ lifecycle }),
    }),
  // PATCH /api/admin/jobs/:id/deactivate
  deactivate: (id) =>
    apiCall(`/api/admin/jobs/${id}/deactivate`, { method: 'PATCH' }),
  // Scraper triggers reuse the public monitor endpoints.
  // POST /api/jobs/monitor/{greenhouse,lever,workday}/trigger
  triggerScraper: (source) =>
    apiCall(`/api/jobs/monitor/${source}/trigger`, { method: 'POST' }),
};

/* -------------------------------------------------------------- ingestion --- */
export const adminIngestionApi = {
  // GET /api/admin/ingestion/sources
  listSources: () => apiCall('/api/admin/ingestion/sources'),
  // POST /api/admin/ingestion/sources
  createSource: (dto) =>
    apiCall('/api/admin/ingestion/sources', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  // PATCH /api/admin/ingestion/sources/:id
  updateSource: (id, dto) =>
    apiCall(`/api/admin/ingestion/sources/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
  // DELETE /api/admin/ingestion/sources/:id
  deleteSource: (id) =>
    apiCall(`/api/admin/ingestion/sources/${id}`, { method: 'DELETE' }),
  // PATCH /api/admin/ingestion/sources/:id/enable { enabled }
  setEnabled: (id, enabled) =>
    apiCall(`/api/admin/ingestion/sources/${id}/enable`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    }),
  // PATCH /api/admin/ingestion/sources/:id/emergency-stop { stopped }
  setEmergencyStop: (id, stopped) =>
    apiCall(`/api/admin/ingestion/sources/${id}/emergency-stop`, {
      method: 'PATCH',
      body: JSON.stringify({ stopped }),
    }),
  // POST /api/admin/ingestion/sources/:id/run
  runSource: (id) =>
    apiCall(`/api/admin/ingestion/sources/${id}/run`, { method: 'POST' }),
  // GET /api/admin/ingestion/runs?sourceId&status&limit
  listRuns: (filters = {}) =>
    apiCall(`/api/admin/ingestion/runs${qs(filters)}`),
  // POST /api/admin/ingestion/runs/:id/cancel
  cancelRun: (id) =>
    apiCall(`/api/admin/ingestion/runs/${id}/cancel`, { method: 'POST' }),
  // GET /api/admin/ingestion/dead-letters?sourceId&reprocessed=false
  listDeadLetters: (filters = {}) =>
    apiCall(`/api/admin/ingestion/dead-letters${qs(filters)}`),
  // POST /api/admin/ingestion/dead-letters/:id/reprocess
  reprocessDeadLetter: (id) =>
    apiCall(`/api/admin/ingestion/dead-letters/${id}/reprocess`, {
      method: 'POST',
    }),
  // GET /api/admin/ingestion/metrics
  metrics: () => apiCall('/api/admin/ingestion/metrics'),
};
