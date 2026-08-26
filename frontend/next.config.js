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
