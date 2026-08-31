// Live interview copilot — session lifecycle.
//
// The REST half. Audio and coaching travel over the socket in
// hooks/useLiveInterview.js; this is create/consent/start/complete.
//
// Consent is a first-class step rather than a checkbox in settings: live
// capture records the INTERVIEWER's voice, which in two-party-consent
// jurisdictions engages wiretap law. The server refuses to open a microphone
// until acknowledgeConsent has been called.

import { API_URL } from '@/config/api';
import { getAccessToken } from '@/lib/apiClient';

const apiCall = async (endpoint, options = {}) => {
  const token = await getAccessToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    const detail = Array.isArray(error.message) ? error.message.join(', ') : error.message;
    throw new Error(detail || 'Request failed');
  }
  return response.json();
};

// The socket authenticates separately from the REST calls and holds a
// long-lived connection. It is async now because the token comes from the
// Supabase session rather than a synchronous localStorage read.
export const getAuthTokenForSocket = getAccessToken;

// POST /api/interview-buddy/sessions
export const createLiveSession = async (payload) =>
  apiCall('/api/interview-buddy/sessions', { method: 'POST', body: JSON.stringify(payload) });

// POST /api/interview-buddy/sessions/:id/consent
export const acknowledgeConsent = async (sessionId, { acknowledged, retainTranscript }) =>
  apiCall(`/api/interview-buddy/sessions/${sessionId}/consent`, {
    method: 'POST',
    body: JSON.stringify({ acknowledged, retainTranscript }),
  });

// POST /api/interview-buddy/sessions/:id/start
export const startLiveSession = async (sessionId) =>
  apiCall(`/api/interview-buddy/sessions/${sessionId}/start`, { method: 'POST' });

// POST /api/interview-buddy/sessions/:id/complete
//   -> { transcriptRetained, discardedTurns }
export const completeLiveSession = async (sessionId) =>
  apiCall(`/api/interview-buddy/sessions/${sessionId}/complete`, { method: 'POST' });

// GET /api/interview-buddy/sessions/:id
export const getLiveSession = async (sessionId) =>
  apiCall(`/api/interview-buddy/sessions/${sessionId}`);
