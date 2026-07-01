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

// ---------------------------------------------------------------- Help center
// The help center is content-driven; if a backend articles endpoint exists it
// is consumed here, otherwise the page falls back to its bundled sample data.
// GET /api/users/help/articles — list of help articles (best-effort).
export const getHelpArticles = async () => apiCall('/api/users/help/articles');

// POST /api/users/help/feedback — { articleId, vote: 'yes' | 'no' }
export const submitArticleFeedback = async (articleId, vote) =>
  apiCall('/api/users/help/feedback', {
    method: 'POST',
    body: JSON.stringify({ articleId, vote }),
  });
