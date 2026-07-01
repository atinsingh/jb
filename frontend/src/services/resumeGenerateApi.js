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

// ------------------------------------------------- resume AI generator ---
// POST /api/resume-builder/generate  (GenerateResumeDto)
//   { role, jobDescription, source, tone, seniority }
//   ->  { id, summary, experience[], skills[], keywords[], coverage }
export const generateResume = async (payload) =>
  apiCall('/api/resume-builder/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// POST /api/resume-builder/generate/section  (RegenerateSectionDto)
//   { section: 'summary' | 'experience' | 'skills', role, jobDescription, tone, seniority }
//   ->  { content }   (string | string[])
export const regenerateGeneratedSection = async (payload) =>
  apiCall('/api/resume-builder/generate/section', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// POST /api/resume-builder  (CreateResumeDto) — used by "Save to library"
export const saveGeneratedResume = async (payload) =>
  apiCall('/api/resume-builder', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
