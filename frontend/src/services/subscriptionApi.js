import { API_URL } from '@/config/api';

// ---------------------------------------------------------------- auth helper
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

// ---------------------------------------------------------------- Entitlement
// GET /api/entitlements — current plan/entitlement for the signed-in user.
// Backend controller is @Controller('entitlements') (plural).
// Returns whatever the backend provides (e.g. { planType, status, ... }).
export const getEntitlement = async () => apiCall('/api/entitlements');

// ---------------------------------------------------------------- Preferences
// GET /api/users/preferences — user preferences (may carry billing prefs).
export const getUserPreferences = async () => apiCall('/api/users/preferences');
