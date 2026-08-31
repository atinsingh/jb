import { API_URL } from '@/config/api';
import { getAccessToken } from '@/lib/apiClient';

// Core fetch wrapper — attaches bearer token, parses JSON, throws on !ok
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

  const text = await response.text();
  return text ? JSON.parse(text) : {};
};

/* -------------------------------------------------------------------------- */
/* Offers — there is no dedicated offers endpoint, so we surface applications  */
/* that have reached an offer stage from the live /api/applications pipeline.  */
/* The page gracefully falls back to design sample data when this is empty or  */
/* the request fails (e.g. unauthenticated).                                   */
/* -------------------------------------------------------------------------- */

// GET /api/applications/my-applications?status=OFFER -> { applications, total }
export const getMyOffers = async (filters = {}) => {
  const params = new URLSearchParams();
  params.append('status', filters.status || 'OFFER');
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.skip) params.append('skip', filters.skip);
  return apiCall(`/api/applications/my-applications?${params.toString()}`);
};
