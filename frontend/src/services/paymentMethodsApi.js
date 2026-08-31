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

// ---------------------------------------------------------------- Payment methods
// GET /api/users/payment-methods — cards on file for the current user
export const getPaymentMethods = async () => apiCall('/api/users/payment-methods');

// POST /api/users/payment-methods — add a new card
export const addPaymentMethod = async (card) =>
  apiCall('/api/users/payment-methods', {
    method: 'POST',
    body: JSON.stringify(card),
  });

// DELETE /api/users/payment-methods/:id — remove a card
export const removePaymentMethod = async (id) =>
  apiCall(`/api/users/payment-methods/${id}`, { method: 'DELETE' });

// PATCH /api/users/payment-methods/:id/default — mark card as default
export const setDefaultPaymentMethod = async (id) =>
  apiCall(`/api/users/payment-methods/${id}/default`, { method: 'PATCH' });
