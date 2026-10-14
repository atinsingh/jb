import { test, expect } from '@playwright/test';
import '../../playwright.config';

test('local signup callbacks stay on localhost instead of the production Site URL', async ({ request }) => {
  const authUrl = `${process.env.SUPABASE_URL}/auth/v1`;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  for (const callback of [
    'http://localhost:3000/auth/success',
    'http://localhost:3000/auth/success?role=ROLE_CANDIDATE',
    'http://localhost:3000/auth/success?role=ROLE_EMPLOYER',
  ]) {
    // Admin link generation exercises the real allow list without sending mail.
    const response = await request.post(`${authUrl}/admin/generate_link`, {
      headers,
      data: {
        type: 'signup',
        email: `signup-redirect-e2e-auto-${crypto.randomUUID()}@example.com`,
        password: 'E2ePassw0rd!2026',
        redirect_to: callback,
      },
    });
    expect(response.ok(), 'Supabase could not generate the signup link').toBe(true);
    const link = await response.json();
    try {
      expect(link.redirect_to).toBe(callback);
      expect(new URL(link.action_link).searchParams.get('redirect_to')).toBe(callback);
    } finally {
      const cleanup = await request.delete(`${authUrl}/admin/users/${link.id ?? link.user?.id}`, { headers });
      expect(cleanup.ok(), 'Could not remove the generated test account').toBe(true);
    }
  }
});
