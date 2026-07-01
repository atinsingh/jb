import { API_URL } from '@/config/api';

// ---------------------------------------------------------------------------
// Resume Library API helper
//
// New, self-contained module — does NOT touch services/api.js. Mirrors the
// fetch / auth / error convention used across the app: bearer token is auto-
// attached from localStorage, JSON body, throws on non-2xx with the backend's
// message.
//
// The "App Resume Library" screen lists every résumé version a user owns
// (one base + tailored copies per role). It reads from the resume-builder
// collection endpoint. The page gracefully falls back to the design's own
// sample library when unauthenticated or when the request fails, so it always
// renders faithfully.
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

// GET /api/resume-builder -> existing résumés (base + tailored) for this user.
// Returns the raw list/collection; the page normalises shape and falls back to
// the sample library on failure.
export const listResumeLibrary = async () => apiCall('/api/resume-builder');
