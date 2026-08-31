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

// ---------------------------------------------------------------- Users
// GET /api/users/profile — current user profile
export const getUserProfile = async () => apiCall('/api/users/profile');

// PATCH /api/users/profile — update profile (UpdateProfileDto)
export const updateUserProfile = async (profile) =>
  apiCall('/api/users/profile', {
    method: 'PATCH',
    body: JSON.stringify(profile),
  });

// POST /api/users/profile/picture — multipart `picture`
export const uploadProfilePicture = async (file) => {
  const token = await getAccessToken();
  const formData = new FormData();
  formData.append('picture', file);

  const response = await fetch(`${API_URL}/api/users/profile/picture`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Upload failed' }));
    throw new Error(error.message || 'Upload failed');
  }
  return response.json();
};

// Supabase owns the identity, so an email change goes to it. It emails BOTH
// the old and new address to confirm, which is why no current password is
// asked for here - proving control of the mailbox is the stronger check.
export const updateUserEmail = async (newEmail) => {
  const { error } = await getSupabaseBrowserClient().auth.updateUser({ email: newEmail });
  if (error) throw new Error(error.message);
  return { message: 'Check both inboxes to confirm the change' };
};

// Supabase owns credentials now, so this goes straight to it rather than to
// PATCH /api/users/password (retired along with the bcrypt paths). Supabase
// takes no currentPassword: the caller must already hold a valid session,
// which is the same guarantee the old endpoint got by re-checking the hash.
export const changeUserPassword = async ({ newPassword }) => {
  const { error } = await getSupabaseBrowserClient().auth.updateUser({
    password: newPassword,
  });
  if (error) throw new Error(error.message);
  return { message: 'Password updated' };
};

// ---------------------------------------------------------------- Entitlements
// GET /api/entitlements — { planType, entitlements }
export const getEntitlements = async () => apiCall('/api/entitlements');

// GET /api/entitlements/plans/:planType — plan entitlements (FREE|PRO|ELITE|INTERVIEW)
export const getPlanEntitlements = async (planType) =>
  apiCall(`/api/entitlements/plans/${planType}`);
