import { API_URL } from '@/config/api';

// ---------------------------------------------------------------- auth ---
const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken') || localStorage.getItem('token');
  }
  return null;
};

// Generic JSON API call, mirrors the convention in services/api.js
const apiCall = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }
  return response.json();
};

// ---------------------------------------------------------- cover letters ---
// GET /api/cover-letters  ->  [{ id, company, role, team, status, body, ... }]
export const listCoverLetters = async () => apiCall('/api/cover-letters');

// GET /api/cover-letters/:id  ->  one cover letter (full document)
export const getCoverLetter = async (id) => apiCall(`/api/cover-letters/${id}`);

// POST /api/cover-letters  (CreateCoverLetterDto)
export const createCoverLetter = async (payload) =>
  apiCall('/api/cover-letters', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// PATCH /api/cover-letters/:id  (UpdateCoverLetterDto)
export const updateCoverLetter = async (id, payload) =>
  apiCall(`/api/cover-letters/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

// POST /api/cover-letters/:id/regenerate  { tone, length }  ->  { body }
export const regenerateCoverLetter = async (id, payload) =>
  apiCall(`/api/cover-letters/${id}/regenerate`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// POST /api/cover-letters/generate  { jobId, tone, length }  ->  { id, body, ... }
export const generateCoverLetter = async (payload) =>
  apiCall('/api/cover-letters/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// GET /api/cover-letters/:id/pdf  ->  PDF binary (blob)
export const downloadCoverLetterPdf = async (id) => {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/api/cover-letters/${id}/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error('PDF download failed');
  return response.blob();
};
