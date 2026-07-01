import { API_URL } from '@/config/api';

// ---------------------------------------------------------------- auth helper
// Mirrors api.js's getAuthToken so we never modify api.js.
const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken') || localStorage.getItem('token');
  }
  return null;
};

// Shared fetch wrapper following the api.js convention (token auto-attached,
// JSON body, throw on !ok). Kept local so we never modify api.js.
const apiCall = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }
  return response.json();
};

// ---------------------------------------------------------------- Entitlements
// GET /api/entitlements — { planType, entitlements }
// Returns the current user's plan + feature flags. Used by the upgrade screen
// to highlight the user's existing plan and trial state.
export const getEntitlement = async () => apiCall('/api/entitlements');

// GET /api/entitlements/plans/:planType — entitlements for a specific plan tier.
// planType is one of FREE | PRO | ELITE | INTERVIEW (backend taxonomy).
export const getPlanEntitlements = async (planType) =>
  apiCall(`/api/entitlements/plans/${planType}`);

// POST /api/entitlements/upgrade — confirm an upgrade.
// Best-effort: the upgrade screen falls back to its local success state if the
// backend does not expose this route.
export const confirmUpgrade = async (payload) =>
  apiCall('/api/entitlements/upgrade', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
