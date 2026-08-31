import { API_URL } from '@/config/api';
import { getAccessToken } from '@/lib/apiClient';

/**
 * Agent (human career-concierge) API client.
 *
 * Wraps the backend `agents` NestJS controller (global prefix `/api`, guarded
 * for ROLE_AGENT). Same convention as services/employerApi.js: JWT auto-attached
 * from localStorage, JSON headers, throws Error(message) on non-2xx. Callers
 * must surface the error via loading / empty / error states — never fall back to
 * fabricated sample data.
 *
 * Endpoint shapes (verified against agents.controller.ts / agents.service.ts):
 *   GET  /api/agents/assigned-candidates
 *        -> { message, candidates: User[], total }
 *   GET  /api/agents/assigned-matches
 *        -> { message, matches: JobMatch[]  (userId, jobId, profileId populated), total }
 *   GET  /api/agents/candidate/:candidateId/profile
 *        -> { message, profile: { user, profiles: JobProfile[],
 *                                 matches: JobMatch[] (jobId, profileId populated),
 *                                 applications: Application[] (jobId, profileId populated) } }
 *   POST  /api/agents/apply/:matchId              -> { message, application }
 *   PATCH /api/agents/application/:applicationId  -> { message, application }
 *         body { status?, agentNotes?, notes? }
 *         status ∈ pending|submitted|reviewing|interviewed|rejected|accepted
 *   POST  /api/agents/application/:applicationId/proof  (multipart, field 'proof', ≤5 files)
 *         -> { message, application }
 */

const apiCall = async (endpoint, options = {}) => {
  const token = await getAccessToken();
  const isForm =
    typeof FormData !== 'undefined' && options.body instanceof FormData;

  // For multipart uploads, let the browser set the Content-Type boundary.
  const headers = isForm
    ? { ...options.headers }
    : { 'Content-Type': 'application/json', ...options.headers };
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

  const text = await response.text();
  return text ? JSON.parse(text) : {};
};

export const agentApi = {
  // Candidates + matches assigned to the signed-in agent.
  assignedCandidates: () => apiCall('/api/agents/assigned-candidates'),
  assignedMatches: () => apiCall('/api/agents/assigned-matches'),

  // Full profile (user, job profiles, matches, applications) for one candidate.
  candidateProfile: (candidateId) =>
    apiCall(`/api/agents/candidate/${candidateId}/profile`),

  // Apply to a job on behalf of the candidate for a given match.
  applyOnBehalf: (matchId) =>
    apiCall(`/api/agents/apply/${matchId}`, { method: 'POST' }),

  // Update an application's status / notes.
  updateApplication: (applicationId, dto) =>
    apiCall(`/api/agents/application/${applicationId}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),

  // Upload proof documents (screenshots, confirmation emails) for an application.
  // `files` is a FileList or File[]; sent as multipart field 'proof' (≤5 files).
  uploadProof: (applicationId, files) => {
    const form = new FormData();
    Array.from(files || [])
      .slice(0, 5)
      .forEach((f) => form.append('proof', f));
    return apiCall(`/api/agents/application/${applicationId}/proof`, {
      method: 'POST',
      body: form,
    });
  },
};

export default agentApi;

// Allowed application status values (mirrors the backend UpdateApplicationDto enum).
export const APPLICATION_STATUSES = [
  'pending',
  'submitted',
  'reviewing',
  'interviewed',
  'rejected',
  'accepted',
];
