import { API_URL } from '@/config/api';
import { getAccessToken } from '@/lib/apiClient';

// Shared fetch wrapper following the api.js convention (token auto-attached,
// JSON body, throw on !ok). Kept local so we never modify api.js.
const apiCall = async (endpoint, options = {}) => {
  const token = await getAccessToken();
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

// ---------------------------------------------------------------- Subscription
// GET /api/users/subscription — current plan/renewal info for the signed-in
// user. Returns whatever the backend provides; the page derives the renewal
// date and Premium status from it, falling back to design sample data.
export const getSubscription = async () => apiCall('/api/users/subscription');

// ---------------------------------------------------------------- Retention
// POST /api/users/subscription/cancel — submit the cancellation flow.
// Body carries the captured reason + optional note + the retention outcome
// ('cancelled' | 'paused' | 'discounted' | 'downgraded' | 'kept').
export const submitCancellation = async ({ reason, note, outcome }) =>
  apiCall('/api/users/subscription/cancel', {
    method: 'POST',
    body: JSON.stringify({ reason, note, outcome }),
  });

// POST /api/users/subscription/retention — accept a retention offer
// (pause / discount / downgrade) instead of cancelling outright.
export const acceptRetentionOffer = async ({ reason, offer }) =>
  apiCall('/api/users/subscription/retention', {
    method: 'POST',
    body: JSON.stringify({ reason, offer }),
  });
