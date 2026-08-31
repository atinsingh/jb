import { API_URL } from '@/config/api';
import { getAccessToken } from '@/lib/apiClient';

// ---------------------------------------------------------------------------
// Interview Buddy / Live Interview API helpers
//
// New module (does not touch the existing services/api.js). Mirrors the
// fetch/auth/error convention used there: token auto-attached from
// localStorage, JSON body, throws on non-2xx with the backend message.
//
// These wrap the Interview-Buddy and Job-Tracker interview-session endpoints
// under the global `/api` prefix. Realtime pieces (live transcript, coaching
// meters) have no backend stream yet, so the page layers graceful sample-data
// stubs on top of these helpers.
// ---------------------------------------------------------------------------

const apiCall = async (endpoint, options = {}) => {
  const token = await getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }
  return response.json();
};

/* ----------------------------------------------- Interview Buddy context --- */

// GET /api/interview-buddy/applications -> { applications }
export const getInterviewApplications = async () =>
  apiCall('/api/interview-buddy/applications');

// GET /api/interview-buddy/resumes -> { resumes }
export const getInterviewResumes = async () =>
  apiCall('/api/interview-buddy/resumes');

// POST /api/interview-buddy/chat -> { response }
// Used as the live "suggested answer" copilot generator.
export const interviewChat = async ({
  message,
  applicationId,
  resumeId,
  conversationHistory,
}) =>
  apiCall('/api/interview-buddy/chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      ...(applicationId ? { applicationId } : {}),
      ...(resumeId ? { resumeId } : {}),
      ...(conversationHistory ? { conversationHistory } : {}),
    }),
  });

/* ------------------------------------------- Live interview sessions --- */

// POST /api/job-tracker/interview-sessions -> session
export const createInterviewSession = async ({ jobId, applicationId, title } = {}) =>
  apiCall('/api/job-tracker/interview-sessions', {
    method: 'POST',
    body: JSON.stringify({
      ...(jobId ? { jobId } : {}),
      ...(applicationId ? { applicationId } : {}),
      ...(title ? { title } : {}),
    }),
  });

// GET /api/job-tracker/interview-sessions?status= -> sessions
export const getInterviewSessions = async (status) => {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiCall(`/api/job-tracker/interview-sessions${qs}`);
};

// GET /api/job-tracker/interview-sessions/:id -> session
export const getInterviewSession = async (id) =>
  apiCall(`/api/job-tracker/interview-sessions/${id}`);

// POST /api/job-tracker/interview-sessions/:id/generate-question -> next question
export const generateInterviewQuestion = async (id) =>
  apiCall(`/api/job-tracker/interview-sessions/${id}/generate-question`, {
    method: 'POST',
  });

// POST /api/job-tracker/interview-sessions/:id/submit-answer -> feedback
export const submitInterviewAnswer = async (id, { question, answer }) =>
  apiCall(`/api/job-tracker/interview-sessions/${id}/submit-answer`, {
    method: 'POST',
    body: JSON.stringify({ question, answer }),
  });

// POST /api/job-tracker/interview-sessions/:id/complete -> completed session
export const completeInterviewSession = async (id) =>
  apiCall(`/api/job-tracker/interview-sessions/${id}/complete`, {
    method: 'POST',
  });
