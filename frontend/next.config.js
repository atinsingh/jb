/*
 * Repo-wide environment.
 *
 * Next only auto-loads `.env*` from its OWN directory, so without this the
 * frontend would need its own `frontend/.env.local` — the duplication this
 * repo deliberately removed. Loading here works because `next.config.js` is
 * evaluated before Next reads `process.env`, and NEXT_PUBLIC_* inlining reads
 * from `process.env` at build time.
 *
 * Only NEXT_PUBLIC_* names reach the browser. The rest — including
 * SUPABASE_SERVICE_ROLE_KEY — stay in the Node process and are never inlined.
 * This deliberately does NOT use Next's `env:` config key, which would inline
 * every variable it is given and publish the server secrets alongside them.
 *
 * Written without `dotenv` on purpose: the package is not a frontend
 * dependency, and adding one to read four lines would be the wrong trade.
 */
const { existsSync, readFileSync } = require('fs');
const { join } = require('path');

for (const file of ['.env.local', '.env']) {
  const path = join(__dirname, '..', file);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    // First value wins, and a real exported env var always beats the file —
    // same precedence the backend loader uses.
    if (process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
}

/** @type {import('next').NextConfig} */

/*
 * Retirement of the first-generation candidate/auth surface.
 *
 * /login, /signup and the whole /candidate/* tree have been deleted; the
 * canonical surface is /app/*. Everything below maps an old path to the screen
 * that actually replaces it, so existing bookmarks, emails and any link we
 * missed in the code still land somewhere correct instead of 404ing.
 *
 * `permanent: false` (307) deliberately: `permanent: true` emits a 308, which
 * browsers cache indefinitely and which is very hard to walk back while this
 * surface is still moving. Flip these to `true` at release, once the /app/*
 * paths are final.
 *
 * Order matters — Next matches top-down, so the /candidate/:path* catch-all
 * must stay last.
 */
const legacyRedirects = [
  // ---- Auth ----
  { source: '/login', destination: '/app/login' },
  { source: '/signup', destination: '/app/signup' },

  // Retired legacy preferences editor (dark, off-design). Its one live unique
  // field (remoteOnly) is now derived from Workplace types on /app/preferences;
  // speedFirst/privacyMode had no backend consumers and were dropped.
  { source: '/preferences', destination: '/app/preferences' },

  // ---- Candidate surface: 1:1 replacements ----
  { source: '/candidate/dashboard', destination: '/app/dashboard' },
  { source: '/candidate/recommendations', destination: '/app/matches' },
  { source: '/candidate/interested', destination: '/app/saved' },
  { source: '/candidate/applications', destination: '/app/tracker' },
  { source: '/candidate/applications/:id', destination: '/app/application' },
  { source: '/candidate/billing', destination: '/app/billing' },
  { source: '/candidate/cover-letter', destination: '/app/cover-letter' },
  { source: '/candidate/job-profiles', destination: '/app/preferences' },
  { source: '/candidate/settings', destination: '/app/settings' },
  // No /app/profile exists; the account surface is /app/settings.
  { source: '/candidate/profile', destination: '/app/settings' },

  // Resume builder: the old tree had create/upload/edit sub-steps that the new
  // builder handles inside one screen, so they all land on the builder — except
  // the upload flow, which has its own screen at /app/resume.
  { source: '/candidate/resume/upload', destination: '/app/resume' },
  { source: '/candidate/resume-builder/create/upload', destination: '/app/resume' },
  { source: '/candidate/resume-builder/:path*', destination: '/app/resume-builder' },
  { source: '/candidate/resume-builder', destination: '/app/resume-builder' },

  // Interview: "interview-buddy" was the practice tool, "interview-prep" the
  // prep hub. Live sessions map to the live-interview screen.
  { source: '/candidate/interview-buddy/session/:id', destination: '/app/live-interview' },
  { source: '/candidate/interview-buddy', destination: '/app/mock-interview' },
  { source: '/candidate/interview-prep/sessions/:id', destination: '/app/interview' },
  { source: '/candidate/interview-prep', destination: '/app/interview' },

  // ---- Anything else under /candidate/* ----
  // Catch-all last: no honest 1:1 target, so send it to the app home rather
  // than guess.
  { source: '/candidate/:path*', destination: '/app/dashboard' },
];

/*
 * Retired marketing pages.
 *
 * /promo was a live "Something Amazing is Coming" splash contradicting a
 * shipped product. /post-job was an unbranded orphan form from the first UI
 * generation, with no nav, no footer and a different typeface; the "Post a job"
 * CTA already points at /employers.
 *
 * /customers is unpublished rather than deleted. Every story on it was
 * fabricated, and two were attributed by name to Stripe and Plaid — companies
 * that are not customers. The page files are kept so it can be republished the
 * moment there are real, permissioned stories to put on it; until then it is
 * removed from the nav and footer and redirected to the page that carries the
 * same argument honestly.
 */
const retiredMarketingRedirects = [
  { source: '/promo', destination: '/' },
  { source: '/post-job', destination: '/employers' },];

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        port: '',
        pathname: '/api/**',
      },
    ],
  },
  reactStrictMode: true,
  compiler: {
    styledComponents: true,
  },
  async redirects() {
    return [...legacyRedirects, ...retiredMarketingRedirects].map((r) => ({
      ...r,
      permanent: false,
    }));
  },
  /*
   * Same-origin proxy to the NestJS API.
   *
   * Normal dev talks to the backend directly on :8000 via NEXT_PUBLIC_API_URL,
   * and this rewrite is unused. It exists for `npm run dev:https`: a page served
   * over TLS may not call an http:// origin — the browser blocks it as mixed
   * content — and putting a certificate on the backend just to browse locally is
   * a lot of moving parts for no benefit. Proxying through Next keeps every
   * request same-origin, so only the frontend needs a cert.
   *
   * There are no Next API routes in this app, so /api/* is free to forward.
   */
  async rewrites() {
    const backend = process.env.BACKEND_PROXY_URL || 'http://localhost:8000';
    return [{ source: '/api/:path*', destination: `${backend}/api/:path*` }];
  },
  /*
   * Security headers applied to every document response.
   *
   * The CSP here is a deliberately *partial* policy: it locks down the
   * directives that don't require per-request nonces — `base-uri` (blocks a
   * <base> tag from re-homing every relative script src), `object-src`
   * (plugin-based script execution), `frame-ancestors` (clickjacking) and
   * `form-action`. A strict `script-src` would need nonce plumbing through
   * Next's inline bootstrap + the theme-init script and is intentionally left
   * out; server-side sanitization of resume HTML is the primary XSS control.
   */
  async headers() {
    const csp = [
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
    ].join('; ');
    return [
      {
        // Document routes only — exclude Next's own build output under /_next/.
        // (The dev server serves some internal manifests with a JSON MIME type,
        // which `nosniff` would otherwise refuse to execute.)
        source: '/((?!_next/).*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
