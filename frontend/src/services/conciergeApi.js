import { API_URL } from '@/config/api';
import { getAccessToken } from '@/lib/apiClient';

/**
 * Concierge API helpers — CANDIDATE-facing only.
 *
 * Follows the same fetch/auth/error convention as services/api.js:
 *  - reads the current Supabase access token via lib/apiClient
 *  - attaches Authorization: Bearer <token>
 *  - throws Error(message) on non-2xx responses
 *
 * These wrap candidate-scoped `matching` and `applications` endpoints
 * (global prefix `/api`). The Concierge screen surfaces real data or an
 * honest empty/error state — it must NOT fabricate sample data.
 *
 * NOTE: the ROLE_AGENT-only `/api/agents/*` endpoints do NOT belong here — a
 * candidate token is rejected by those routes. Agent tooling lives in
 * services/agentApi.js. A candidate-facing "who is my concierge / assignment
 * status" endpoint does not yet exist on the backend (backlog).
 */

const apiCall = async (endpoint, options = {}) => {
  const token = await getAccessToken();
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

export const CONCIERGE_DURATION_MINUTES = Array.from({ length: 32 }, (_, index) => (index + 1) * 15);

export const conciergeDurationLabel = (minutes) => {
  const value = Number(minutes);
  if (!Number.isFinite(value)) return 'session';
  if (value < 60) return `${value} min`;
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  const hourLabel = `${hours} hour${hours === 1 ? '' : 's'}`;
  return rest ? `${hourLabel} ${rest} min` : hourLabel;
};

export const conciergeDurationPrice = (hourlyRate, minutes) => (Number(hourlyRate) * Number(minutes)) / 60;

export const conciergeCad = (amount) => (Number.isInteger(Number(amount)) ? String(Number(amount)) : Number(amount).toFixed(2));

export const conciergeDurationLinkOk = (url) => {
  const raw = String(url || '').trim();
  if (/["'<>\u0000-\u001F\u007F]/.test(raw)) return false;
  try {
    const host = new URL(raw).hostname.toLowerCase().replace(/^www\./, '');
    return ['calendly.com', 'meet.google.com', 'calendar.google.com', 'calendar.app.google'].includes(host);
  } catch {
    return false;
  }
};

export const getConciergeCoaches = () => apiCall('/api/billing/concierge/coaches');

export const buyConciergeHours = (employerId, minutes) => apiCall('/api/billing/concierge/checkout', {
  method: 'POST',
  body: JSON.stringify({ employerId, minutes }),
});

export const getMyConciergeBookings = () => apiCall('/api/billing/concierge/bookings');

export const markConciergeBookingScheduled = (id) => apiCall(`/api/billing/concierge/bookings/${id}/scheduled`, { method: 'POST' });

export const cancelConciergeBooking = (id) => apiCall(`/api/billing/concierge/bookings/${id}/cancel`, { method: 'POST' });

export const reportConciergeMissed = (id) => apiCall(`/api/billing/concierge/bookings/${id}/missed`, { method: 'POST' });

export const conciergeBookUrl = (url, bookingId) => {
  try {
    const next = new URL(url);
    if (next.hostname.replace(/^www\./, '') === 'calendly.com') next.searchParams.set('utm_content', bookingId);
    return next.toString();
  } catch {
    return url;
  }
};

export const getConciergeMessages = (withId) => apiCall(`/api/billing/concierge/messages?with=${encodeURIComponent(withId)}`);

export const sendConciergeMessage = (withId, body) => apiCall('/api/billing/concierge/messages', {
  method: 'POST',
  body: JSON.stringify({ with: withId, body }),
});

/* -------------------------------------------------- Entitlements --- */

// GET /api/entitlements → { planType, entitlements }
export const getEntitlements = async () => {
  return apiCall('/api/entitlements');
};
