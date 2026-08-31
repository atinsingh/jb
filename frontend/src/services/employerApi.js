import { API_URL } from '@/config/api';
import { getAccessToken } from '@/lib/apiClient';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Employer API client.
 *
 * Talks to the employer NestJS modules. Same convention as the candidate
 * service modules: JWT auto-attached from localStorage, JSON headers, throws on
 * non-2xx. Callers must surface the error (loading / empty / error states) —
 * never fall back to fabricated sample data.
 */

const apiCall = async (endpoint, options = {}) => {
  const token = await getAccessToken();
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
  // POST /api/employer/jobs/generate-description -> { draft }
  // AI-drafts description/responsibilities/requirements/benefits from what's
  // already been typed. A draft only — nothing is saved by this call.
  generateDescription: (seed) =>
    apiCall('/api/employer/jobs/generate-description', {
      method: 'POST',
      body: JSON.stringify(seed),
    }),
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
  // POST /api/employer/ai/autopilot/run-now
  runAutopilotNow: () =>
    apiCall('/api/employer/ai/autopilot/run-now', { method: 'POST' }),
  // GET /api/employer/ai/proposed-actions?status=
  listProposedActions: (status) =>
    apiCall(`/api/employer/ai/proposed-actions${status ? `?status=${status}` : ''}`),
  // POST /api/employer/ai/proposed-actions/:id/decide { decision }
  decideProposedAction: (id, decision) =>
    apiCall(`/api/employer/ai/proposed-actions/${id}/decide`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
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
  // GET /api/employer/billing/plans -> { currentPlan, billingCycle, plans:[...] }
  plans: () => apiCall('/api/employer/billing/plans'),
  // POST /api/employer/billing/upgrade { plan, billingCycle? }
  upgrade: (dto) =>
    apiCall('/api/employer/billing/upgrade', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
};

/* ----------------------------------------------------------------- audit --- */
export const employerAuditApi = {
  // GET /api/employer/audit?category&ai&search -> { events:[...] }
  list: (filters = {}) => apiCall(`/api/employer/audit${qs(filters)}`),
  record: (dto) =>
    apiCall('/api/employer/audit', { method: 'POST', body: JSON.stringify(dto) }),
};

/* ------------------------------------------------------------ compliance --- */
export const employerComplianceApi = {
  // GET /api/employer/compliance -> { requests, consents, retention }
  get: () => apiCall('/api/employer/compliance'),
  createRequest: (dto) =>
    apiCall('/api/employer/compliance/requests', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  updateRequest: (id, status) =>
    apiCall(`/api/employer/compliance/requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

/* ---------------------------------------------------------- integrations --- */
export const employerIntegrationsApi = {
  // GET /api/employer/integrations -> { integrations:[...] }
  list: () => apiCall('/api/employer/integrations'),
  connect: (id, dto = {}) =>
    apiCall(`/api/employer/integrations/${id}/connect`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  disconnect: (id) =>
    apiCall(`/api/employer/integrations/${id}/disconnect`, { method: 'POST' }),
  update: (id, dto) =>
    apiCall(`/api/employer/integrations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
};

/* ------------------------------------------------------------- developer --- */
export const employerDeveloperApi = {
  listKeys: () => apiCall('/api/employer/developer/keys'),
  createKey: (dto) =>
    apiCall('/api/employer/developer/keys', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  deleteKey: (id) =>
    apiCall(`/api/employer/developer/keys/${id}`, { method: 'DELETE' }),
  listWebhooks: () => apiCall('/api/employer/developer/webhooks'),
  createWebhook: (dto) =>
    apiCall('/api/employer/developer/webhooks', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  deleteWebhook: (id) =>
    apiCall(`/api/employer/developer/webhooks/${id}`, { method: 'DELETE' }),
};

/* -------------------------------------------------------------- security --- */
export const employerSecurityApi = {
  // GET /api/employer/security -> { settings }
  get: () => apiCall('/api/employer/security'),
  update: (dto) =>
    apiCall('/api/employer/security', {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
};

/* ---------------------------------------------------------- talent pool --- */
export const employerTalentApi = {
  // GET /api/employer/talent-pool?segment&search -> { candidates, counts }
  list: (filters = {}) => apiCall(`/api/employer/talent-pool${qs(filters)}`),
  create: (dto) =>
    apiCall('/api/employer/talent-pool', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  remove: (id) =>
    apiCall(`/api/employer/talent-pool/${id}`, { method: 'DELETE' }),
};

/* ---------------------------------------------------------- distribution --- */
export const employerDistributionApi = {
  // GET /api/employer/distribution -> { channels, performance }
  get: () => apiCall('/api/employer/distribution'),
  updateChannel: (key, dto) =>
    apiCall(`/api/employer/distribution/${key}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
};

/* --------------------------------------------------------- notifications --- */
export const employerNotificationsApi = {
  // GET /api/employer/notifications?type -> { notifications, unread }
  list: (filters = {}) => apiCall(`/api/employer/notifications${qs(filters)}`),
  markAllRead: () =>
    apiCall('/api/employer/notifications/read-all', { method: 'POST' }),
  markRead: (id) =>
    apiCall(`/api/employer/notifications/${id}/read`, { method: 'PATCH' }),
};

/* ------------------------------------------------------------- approvals --- */
export const employerApprovalsApi = {
  // GET /api/employer/approvals -> { approvals:[...] }
  list: () => apiCall('/api/employer/approvals'),
  decide: (id, dto) =>
    apiCall(`/api/employer/approvals/${id}/decision`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  create: (dto) =>
    apiCall('/api/employer/approvals', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
};

/* ------------------------------------------------------------ interviews --- */
export const employerInterviewsApi = {
  // GET /api/employer/interviews?stage -> { interviews:[...] }
  list: (filters = {}) => apiCall(`/api/employer/interviews${qs(filters)}`),
  get: (id) => apiCall(`/api/employer/interviews/${id}`),
  create: (dto) =>
    apiCall('/api/employer/interviews', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  update: (id, dto) =>
    apiCall(`/api/employer/interviews/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
  submitScorecard: (id, dto) =>
    apiCall(`/api/employer/interviews/${id}/scorecard`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
};

/* ---------------------------------------------------------------- offers --- */
export const employerOffersApi = {
  // GET /api/employer/offers -> { offers:[...] }
  list: (filters = {}) => apiCall(`/api/employer/offers${qs(filters)}`),
  get: (id) => apiCall(`/api/employer/offers/${id}`),
  create: (dto) =>
    apiCall('/api/employer/offers', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  update: (id, dto) =>
    apiCall(`/api/employer/offers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
  setStatus: (id, status) =>
    apiCall(`/api/employer/offers/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

/* ------------------------------------------------------------------ team --- */
export const employerTeamApi = {
  // GET /api/employer/team -> { org: { members, invites, ... } }
  get: () => apiCall('/api/employer/team'),
  invite: (dto) =>
    apiCall('/api/employer/team/invite', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  updateMemberRole: (memberId, role) =>
    apiCall(`/api/employer/team/members/${memberId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  removeMember: (memberId) =>
    apiCall(`/api/employer/team/members/${memberId}`, { method: 'DELETE' }),
};

/* --------------------------------------------------------------- company --- */
export const employerCompanyApi = {
  // GET /api/employer/company -> { company }
  get: () => apiCall('/api/employer/company'),
  update: (dto) =>
    apiCall('/api/employer/company', {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
};

/* -------------------------------------------------------------- messages --- */
export const employerMessagesApi = {
  // GET /api/employer/messages/conversations -> { conversations:[...] }
  listConversations: () => apiCall('/api/employer/messages/conversations'),
  createConversation: (dto) =>
    apiCall('/api/employer/messages/conversations', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  // GET /api/employer/messages/conversations/:id/messages -> { conversation, messages }
  getMessages: (conversationId) =>
    apiCall(`/api/employer/messages/conversations/${conversationId}/messages`),
  sendMessage: (conversationId, body) =>
    apiCall(
      `/api/employer/messages/conversations/${conversationId}/messages`,
      { method: 'POST', body: JSON.stringify({ body }) },
    ),
};

/* --------------------------------------------------------------- profile --- */
/* The signed-in employer user's own account — served by the shared users module. */
export const employerProfileApi = {
  // GET /api/users/profile -> { user }
  get: () => apiCall('/api/users/profile'),
  update: (dto) =>
    apiCall('/api/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
  // Supabase owns the identity; see settingsApi.updateUserEmail.
  updateEmail: async (email) => {
    const { error } = await getSupabaseBrowserClient().auth.updateUser({ email });
    if (error) throw new Error(error.message);
    return { message: 'Check both inboxes to confirm the change' };
  },
  // Supabase owns credentials; see securityApi.changePassword.
  changePassword: async (_currentPassword, newPassword) => {
    const { error } = await getSupabaseBrowserClient().auth.updateUser({
      password: newPassword,
    });
    if (error) throw new Error(error.message);
    return { message: 'Password updated' };
  },
};
