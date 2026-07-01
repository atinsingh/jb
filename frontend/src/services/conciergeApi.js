import { API_URL } from '@/config/api';

/**
 * Concierge API helpers.
 *
 * Follows the same fetch/auth/error convention as services/api.js:
 *  - reads the JWT from localStorage ('authToken' || 'token')
 *  - attaches Authorization: Bearer <token>
 *  - throws Error(message) on non-2xx responses
 *
 * These wrap the backend `agents`, `matching` and `applications`
 * controllers (global prefix `/api`). Every call is wrapped by the
 * caller in try/catch so the Concierge screen can gracefully fall back
 * to its design sample data when the backend is offline / unauthorized.
 */

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

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
};

/* -------------------------------------------------- Agents (coach) --- */

// GET /api/agents/assigned-candidates → { candidates, total }
export const getAssignedCandidates = async () => {
  return apiCall('/api/agents/assigned-candidates');
};

// GET /api/agents/assigned-matches → { matches, total }
export const getAssignedMatches = async () => {
  return apiCall('/api/agents/assigned-matches');
};

// GET /api/agents/candidate/:candidateId/profile → { profile }
export const getCandidateProfile = async (candidateId) => {
  return apiCall(`/api/agents/candidate/${candidateId}/profile`);
};

/* ------------------------------------------ Matching (curated roles) --- */

// GET /api/matching/matches?minScore → { matches, total }
export const getMyMatches = async (minScore) => {
  const params = new URLSearchParams();
  if (minScore != null) params.append('minScore', minScore);
  const qs = params.toString();
  return apiCall(`/api/matching/matches${qs ? `?${qs}` : ''}`);
};

// GET /api/matching/recommendations?minScore → { recommendations, total }
export const getRecommendations = async (minScore = 60) => {
  return apiCall(`/api/matching/recommendations?minScore=${minScore}`);
};

/* ------------------------------------ Applications (coach activity) --- */

// GET /api/applications/activity?since&limit&skip&type → { events, total }
export const getConciergeActivity = async (params = {}) => {
  const search = new URLSearchParams();
  if (params.since) search.append('since', params.since);
  if (params.limit) search.append('limit', params.limit);
  if (params.skip) search.append('skip', params.skip);
  if (params.type) {
    if (Array.isArray(params.type)) {
      params.type.forEach((t) => search.append('type', t));
    } else {
      search.append('type', params.type);
    }
  }
  const qs = search.toString();
  return apiCall(`/api/applications/activity${qs ? `?${qs}` : ''}`);
};

/* -------------------------------------------------- Entitlements --- */

// GET /api/entitlements → { planType, entitlements }
export const getEntitlements = async () => {
  return apiCall('/api/entitlements');
};
