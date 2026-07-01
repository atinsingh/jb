import { API_URL } from '@/config/api';

/**
 * Employer API client.
 *
 * Talks to the employer NestJS modules (employer-jobs, employer-pipeline,
 * ai-recruiter, employer-billing). Same convention as the candidate service
 * modules: JWT auto-attached from localStorage, JSON headers, throws on non-2xx
 * so the calling page can gracefully fall back to design sample data.
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

/* ------------------------------------------------------------------ jobs --- */
export const employerJobsApi = {
  // GET /api/employer/jobs -> { message, jobs, total }
  list: (filters = {}) => apiCall(`/api/employer/jobs${qs(filters)}`),
  // GET /api/employer/jobs/:id
  get: (id) => apiCall(`/api/employer/jobs/${id}`),
  // POST /api/employer/jobs
  create: (dto) =>
    apiCall('/api/employer/jobs', { method: 'POST', body: JSON.stringify(dto) }),
  // PATCH /api/employer/jobs/:id
  update: (id, dto) =>
    apiCall(`/api/employer/jobs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
  // PATCH /api/employer/jobs/:id/status
  setStatus: (id, status) =>
    apiCall(`/api/employer/jobs/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  // DELETE /api/employer/jobs/:id
  remove: (id) => apiCall(`/api/employer/jobs/${id}`, { method: 'DELETE' }),
};

/* -------------------------------------------------------------- pipeline --- */
export const employerPipelineApi = {
  // GET /api/employer/applicants/stats?jobId -> { total, applied, ... }
  stats: (jobId) => apiCall(`/api/employer/applicants/stats${qs({ jobId })}`),
  // GET /api/employer/applicants?jobId&stage
  list: (filters = {}) => apiCall(`/api/employer/applicants${qs(filters)}`),
  get: (id) => apiCall(`/api/employer/applicants/${id}`),
  create: (dto) =>
    apiCall('/api/employer/applicants', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  updateStage: (id, stage) =>
    apiCall(`/api/employer/applicants/${id}/stage`, {
      method: 'PATCH',
      body: JSON.stringify({ stage }),
    }),
  addNote: (id, text) =>
    apiCall(`/api/employer/applicants/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
};

/* ----------------------------------------------------------- ai recruiter --- */
export const aiRecruiterApi = {
  // GET /api/employer/ai/autopilot
  autopilot: () => apiCall('/api/employer/ai/autopilot'),
  toggleAutopilot: (enabled) =>
    apiCall('/api/employer/ai/autopilot/toggle', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    }),
  // POST /api/employer/ai/screen { jobId? }
  screen: (jobId) =>
    apiCall('/api/employer/ai/screen', {
      method: 'POST',
      body: JSON.stringify({ jobId }),
    }),
  // POST /api/employer/ai/copilot { message }
  copilot: (message) =>
    apiCall('/api/employer/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
  // POST /api/employer/ai/sourcing { brief }
  sourcing: (brief) =>
    apiCall('/api/employer/ai/sourcing', {
      method: 'POST',
      body: JSON.stringify({ brief }),
    }),
  // POST /api/employer/ai/interview/scorecard { transcript?, notes? }
  scorecard: (payload) =>
    apiCall('/api/employer/ai/interview/scorecard', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

/* --------------------------------------------------------------- billing --- */
export const employerBillingApi = {
  // GET /api/employer/billing/subscription
  subscription: () => apiCall('/api/employer/billing/subscription'),
  // GET /api/employer/billing/usage
  usage: () => apiCall('/api/employer/billing/usage'),
  // GET /api/employer/billing/invoices
  invoices: () => apiCall('/api/employer/billing/invoices'),
  // POST /api/employer/billing/upgrade { plan, billingCycle? }
  upgrade: (dto) =>
    apiCall('/api/employer/billing/upgrade', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
};
