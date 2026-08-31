import { API_URL } from '@/config/api';
import { getAccessToken } from '@/lib/apiClient';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

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

// ---------------------------------------------------------------- Password
// Supabase owns credentials now, so this goes straight to it rather than to
// PATCH /api/users/password (retired along with the bcrypt paths). Supabase
// takes no currentPassword: the caller must already hold a valid session,
// which is the same guarantee the old endpoint got by re-checking the hash.
export const changePassword = async ({ newPassword }) => {
  const { error } = await getSupabaseBrowserClient().auth.updateUser({
    password: newPassword,
  });
  if (error) throw new Error(error.message);
  return { message: 'Password updated' };
};
