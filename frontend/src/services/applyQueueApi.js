// Service helpers for the approval queue (/app/apply).
//
// Applications are PREPARED by the server — filled in completely, screenshotted,
// and parked — then wait here until the candidate approves them. Nothing is
// submitted without an explicit approval.
//
// Follows the same fetch/auth/error convention as services/savedApi.js.

import { API_URL } from '@/config/api';
import { getAccessToken } from '@/lib/apiClient';

const apiCall = async (endpoint, options = {}) => {
  const token = await getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    const detail = Array.isArray(error.message) ? error.message.join(', ') : error.message;
    throw new Error(detail || 'Request failed');
  }
  return response.json();
};

// GET /api/apply-runner/queue
//   -> { items[], total, clean, needsYou }
// Each item carries the answers that will be submitted, each tagged with where
// it came from ('profile' | 'bank' | 'identity' | 'candidate' | 'ai_draft').
export const getApprovalQueue = async () => apiCall('/api/apply-runner/queue');

// POST /api/apply-runner/queue/:id/answer
//   { questionKey, value, profileField?, country? }
// Writes through to the answer bank (and the profile for attestations), so the
// same question resolves itself on every future application.
export const answerBlocker = async (applicationId, payload) =>
  apiCall(`/api/apply-runner/queue/${applicationId}/answer`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// POST /api/apply-runner/queue/:id/approve
export const approveApplication = async (applicationId) =>
  apiCall(`/api/apply-runner/queue/${applicationId}/approve`, { method: 'POST' });

// POST /api/apply-runner/queue/approve-clean
export const approveAllClean = async () =>
  apiCall('/api/apply-runner/queue/approve-clean', { method: 'POST' });

// POST /api/apply-runner/queue/:id/decline
export const declineApplication = async (applicationId, reason) =>
  apiCall(`/api/apply-runner/queue/${applicationId}/decline`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
