// Candidate notifications API client.
// Same fetch/auth/error convention as the other candidate service modules
// (matchesApi.js, employerApi.js): JWT auto-attached from localStorage, JSON
// headers, throws on non-2xx. Callers surface loading / empty / error states —
// never fall back to fabricated sample data.

import { API_URL } from '@/config/api';

const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken') || localStorage.getItem('token');
  }
  return null;
};

const apiCall = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: 'Request failed' }));
    const message = Array.isArray(error.message)
      ? error.message.join(', ')
      : error.message || 'Request failed';
    throw new Error(message);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : {};
};

const qs = (params = {}) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') sp.append(k, v);
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
};

export const notificationsApi = {
  // GET /api/notifications?type -> { notifications, unread }
  list: (filters = {}) => apiCall(`/api/notifications${qs(filters)}`),
  markAllRead: () => apiCall('/api/notifications/read-all', { method: 'POST' }),
  markRead: (id) =>
    apiCall(`/api/notifications/${id}/read`, { method: 'PATCH' }),
};

export default notificationsApi;
