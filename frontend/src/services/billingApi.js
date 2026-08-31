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

// ---------------------------------------------------------------- Billing
// There is no live billing/invoices endpoint on the backend yet. We expose
// thin helpers that hit the closest existing surface (entitlements, which lives
// under /api/users) so the page can attempt a real fetch and gracefully fall
// back to the design's own sample data on failure / when unauthenticated.

// GET /api/users/entitlements — current plan entitlements (used to derive the
// "next charge" summary). Returns whatever the backend provides; the page
// normalizes and falls back when it is unavailable.
export const getBillingSummary = async () => apiCall('/api/users/entitlements');

// GET /api/users/invoices — invoice history. No live endpoint exists today;
// this will throw and the page falls back to SAMPLE_INVOICES.
export const getInvoices = async () => apiCall('/api/users/invoices');
