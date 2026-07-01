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

// ---------------------------------------------------------------- Support
// Support is ticket-driven. If a backend support endpoint exists it is consumed
// here; otherwise the page falls back to its bundled sample tickets so it always
// renders. All calls are best-effort and the page swallows failures gracefully.

// GET /api/users/support/tickets — the signed-in user's support requests.
export const getMyTickets = async () => apiCall('/api/users/support/tickets');

// POST /api/users/support/tickets — open a new request.
// { category, subject, message, priority }
export const createTicket = async ({ category, subject, message, priority }) =>
  apiCall('/api/users/support/tickets', {
    method: 'POST',
    body: JSON.stringify({ category, subject, message, priority }),
  });

// POST /api/users/support/tickets/:id/reply — add a reply to a thread.
export const replyToTicket = async (ticketId, text) =>
  apiCall(`/api/users/support/tickets/${encodeURIComponent(ticketId)}/reply`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
