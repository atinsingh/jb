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
export const getPlans = async () => apiCall('/api/billing/plans');

export const getSubscription = async () => apiCall('/api/billing/subscription');

// The authoritative measured LiteLLM spend and monthly USD allowance.
export const getAiBudget = async () => apiCall('/api/resume-harness/budget');

export const createCheckout = async (planId, billingCycle) =>
  apiCall('/api/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ planId, billingCycle }),
  });

// GET /api/users/entitlements — current plan entitlements (used to derive the
// "next charge" summary). Returns whatever the backend provides; the page
// normalizes and falls back when it is unavailable.
export const getBillingSummary = async () => apiCall('/api/users/entitlements');

// Candidate invoices intentionally remain on the established users endpoint.
export const getInvoices = async () => apiCall('/api/users/invoices');
