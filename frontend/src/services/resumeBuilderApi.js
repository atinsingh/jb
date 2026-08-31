import { API_URL } from '@/config/api';
import { getAccessToken } from '@/lib/apiClient';

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

/* -------------------------------------------------- builder configurator --- */

// Templates are a static catalogue on the frontend (see
// components/resume/resumeTemplates.jsx). There is no backend templates route —
// /api/resume-builder/templates was falling through to GET(:id) and breaking —
// so resolve the local catalogue directly (no network). Kept as a lightweight,
// serialisable shape (no React component refs).
const LOCAL_TEMPLATE_CATALOG = [
  { key: 'classic', name: 'Classic', twoCol: false, tags: ['single column'] },
  { key: 'modern', name: 'Modern', twoCol: false, tags: ['accent header'] },
  { key: 'sidebar', name: 'Sidebar', twoCol: true, tags: ['two column'] },
  { key: 'minimal', name: 'Minimal', twoCol: false, tags: ['monochrome'] },
  { key: 'elegant', name: 'Elegant', twoCol: false, tags: ['serif'] },
];

// GET /api/resume-builder/templates -> [{ key, name, twoCol, tags }]
export const getResumeTemplates = async () => LOCAL_TEMPLATE_CATALOG;

// There is no /api/resume-builder/context route (it was falling through to
// GET(:id) and breaking). No obvious backend service method exists to seed the
// preview, so resolve null (no network) — the page falls back to its design
// sample. (Backlog: add a real builder-context endpoint if seeded previews are
// wanted.)
export const getResumeBuilderContext = async () => null;

// GET /api/resume-builder -> existing resumes for this user
export const listBuilderResumes = async () => apiCall('/api/resume-builder');

// POST /api/resume-builder -> create a resume from the chosen configuration.
// payload: { template, accent, fontPair, density, source }
export const createBuilderResume = async (payload) =>
  apiCall('/api/resume-builder', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
