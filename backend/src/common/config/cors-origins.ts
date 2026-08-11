/**
 * Browser origins allowed to call this API.
 *
 * `FRONTEND_URL` deliberately stays SINGLE-VALUED. A dozen call sites build real
 * URLs from it — password-reset and verification emails, Stripe return URLs,
 * OAuth redirects — and every one of them would emit a comma-joined string if
 * that variable became a list.
 *
 * So the two concepts are kept apart:
 *   FRONTEND_URL        where this app lives, for building links people click
 *   CORS_EXTRA_ORIGINS  who else may call this API from a browser
 *
 * The extra origins exist because a developer machine often cannot give this app
 * its default port — another project may already hold it — and because the
 * browser E2E suite needs a stable origin of its own.
 */
export function corsOrigins(): string[] {
  const primary = process.env.FRONTEND_URL || 'http://localhost:3000';

  const extra = (process.env.CORS_EXTRA_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // De-duplicate so a repeated origin does not appear twice in the allowlist.
  return [...new Set([primary, ...extra])];
}
