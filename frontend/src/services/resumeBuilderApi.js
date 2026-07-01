import { API_URL } from '@/config/api';

// ---------------------------------------------------------------------------
// Resume Builder (configurator) API helpers
//
// New module — does NOT touch services/api.js or services/resumeApi.js.
// Mirrors the fetch/auth/error convention used across the app: the bearer
// token is auto-attached from localStorage, JSON body, throws on non-2xx
// with the backend's message.
//
// The "App Resume Builder" screen is mostly client-driven (template / source /
// style configurator). These helpers pull whatever real builder context the
// backend can provide so the live preview can be seeded with the user's own
// data; the page falls back to the design's sample resume when unauthenticated
// or when any request fails.
// ---------------------------------------------------------------------------

const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken') || localStorage.getItem('token');
  }
  return null;
};

const apiCall = async (endpoint, options = {}) => {
  const token = getAuthToken();
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

/* -------------------------------------------------- builder configurator --- */

// GET /api/resume-builder/templates -> [{ key, name, twoCol, atsScore, tags }]
// Optional catalogue of layouts the backend supports. Page merges these onto
// its baked-in template list so labels/ATS scores stay in sync when available.
export const getResumeTemplates = async () =>
  apiCall('/api/resume-builder/templates');

// GET /api/resume-builder/context -> seed data for the live preview
// (name, title, contact, summary, experience, skills, education). Falls back
// to the design sample on the page when this fails.
export const getResumeBuilderContext = async () =>
  apiCall('/api/resume-builder/context');

// GET /api/resume-builder -> existing resumes for this user
export const listBuilderResumes = async () => apiCall('/api/resume-builder');

// POST /api/resume-builder -> create a resume from the chosen configuration.
// payload: { template, accent, fontPair, density, source }
export const createBuilderResume = async (payload) =>
  apiCall('/api/resume-builder', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
