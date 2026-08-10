// ATS compatibility checking.
//
// Two endpoints answering two DIFFERENT questions — keeping them apart is the
// whole design:
//
//   checkAts  — "will a parser read this résumé at all?" A property of the
//               document. Deterministic, no model involved, and PERSISTED to
//               the résumé as atsScore, which is what the library's score ring
//               and sort read.
//
//   matchAts  — "does this résumé match THIS job?" A property of a pairing, so
//               it changes per application and is deliberately EPHEMERAL. It
//               never overwrites atsScore, because a stored number that moved
//               every time you looked at a different job would be meaningless.
//
// Follows the fetch/auth/error convention in services/applyQueueApi.js.

import { API_URL } from '@/config/api';

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
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    const detail = Array.isArray(error.message) ? error.message.join(', ') : error.message;
    throw new Error(detail || 'Request failed');
  }
  return response.json();
};

// POST /api/resume-builder/:id/ats-check
//   -> { score, checkedAt, extractedTextLength, findings: [{ code, severity, message, fix }] }
// Every finding carries an actionable fix by construction.
export const checkAts = async (resumeId) =>
  apiCall(`/api/resume-builder/${resumeId}/ats-check`, { method: 'POST' });

// POST /api/resume-builder/:id/ats-match  { jobDescription }
//   -> { coverage, matched[], missing[], keywordCount }
// `missing` is the actionable part; a bare percentage tells a candidate nothing.
export const matchAts = async (resumeId, jobDescription) =>
  apiCall(`/api/resume-builder/${resumeId}/ats-match`, {
    method: 'POST',
    body: JSON.stringify({ jobDescription }),
  });
