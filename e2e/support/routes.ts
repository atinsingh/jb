/**
 * The route manifest driving the smoke layer.
 *
 * Every page in the app is listed here exactly once, with the role that may see
 * it. This is deliberately a hand-maintained list rather than a filesystem
 * glob: a new page should force a conscious decision about who can reach it and
 * what proves it loaded, and a glob would silently "cover" a page by asserting
 * nothing meaningful about it.
 *
 * `expectText` is the cheapest possible proof that the page rendered its own
 * content rather than a shell, an error boundary, or a redirect to login.
 */

export type Audience = 'public' | 'candidate' | 'employer';

export interface RouteSpec {
  path: string;
  /** Human label used in test titles and failure messages. */
  name: string;
  audience: Audience;
  /** Case-insensitive text expected somewhere on the page. */
  expectText?: RegExp;
  /**
   * Routes that legitimately call an endpoint returning >= 400 (e.g. a feature
   * gated behind a plan the test user lacks). Passed to guards.allowFailures.
   */
  allowFailures?: string[];
  /** Skip with a stated reason — never silently. */
  skip?: string;
}

/**
 * Marketing and legal surfaces — reachable signed out.
 *
 * Reduced to the Candidate v3 information architecture: the design defines
 * three public screens (Product / Pricing / About), and this list keeps those
 * plus the real product surface (/jobs), the employer logged-out funnel and
 * the legal pages. Thirteen marketing and duplicate routes were deleted, not
 * redirected — the site had never been deployed, so there was nothing to
 * preserve.
 */
export const PUBLIC_ROUTES: RouteSpec[] = [
  { path: '/', name: 'home', audience: 'public' },
  { path: '/about', name: 'about', audience: 'public' },
  { path: '/pricing', name: 'pricing', audience: 'public' },
  { path: '/employers', name: 'employers landing', audience: 'public' },
  { path: '/employers/pricing', name: 'employer pricing', audience: 'public' },
  { path: '/jobs', name: 'public job search', audience: 'public' },
  { path: '/terms', name: 'terms', audience: 'public' },
  { path: '/privacy', name: 'privacy', audience: 'public' },
  { path: '/cookies', name: 'cookies', audience: 'public' },
  { path: '/gdpr', name: 'gdpr', audience: 'public' },
  { path: '/unauthorized', name: 'unauthorized', audience: 'public' },
];

/** Pre-auth account routes — reachable signed out, own their own forms. */
export const AUTH_ROUTES: RouteSpec[] = [
  { path: '/app/login', name: 'login', audience: 'public' },
  { path: '/app/signup', name: 'signup', audience: 'public' },
  { path: '/app/reset-password', name: 'reset password', audience: 'public' },
  {
    path: '/app/verify-email',
    name: 'verify email',
    audience: 'public',
    // Deliberately probes "am I already logged in?" via /api/users/profile and
    // catches the 401 silently (verify-email.jsx) when the answer is no — a
    // normal outcome for a signed-out visitor, not a defect.
    allowFailures: ['/api/users/profile'],
  },
];

/** The signed-in candidate product. */
export const CANDIDATE_ROUTES: RouteSpec[] = [
  { path: '/app/dashboard', name: 'dashboard', audience: 'candidate' },
  { path: '/app/matches', name: 'matches', audience: 'candidate' },
  { path: '/app/job-profiles', name: 'job profiles', audience: 'candidate' },
  { path: '/app/preferences', name: 'preferences', audience: 'candidate' },
  { path: '/app/resume', name: 'resume generator', audience: 'candidate' },
  { path: '/app/resume-library', name: 'resume library', audience: 'candidate' },
  { path: '/app/cover-letter', name: 'cover letters', audience: 'candidate' },
  { path: '/app/apply', name: 'apply queue', audience: 'candidate' },
  { path: '/app/auto-apply', name: 'auto-apply', audience: 'candidate' },
  { path: '/app/tracker', name: 'application tracker', audience: 'candidate' },
  { path: '/app/saved', name: 'saved jobs', audience: 'candidate' },
  { path: '/app/offers', name: 'offers', audience: 'candidate' },
  { path: '/app/interview', name: 'interview prep', audience: 'candidate' },
  { path: '/app/mock-interview', name: 'mock interview', audience: 'candidate' },
  { path: '/app/live-interview', name: 'live interview', audience: 'candidate' },
  { path: '/app/messages', name: 'messages', audience: 'candidate' },
  { path: '/app/notifications', name: 'notifications', audience: 'candidate' },
  { path: '/app/settings', name: 'settings', audience: 'candidate' },
  { path: '/app/security', name: 'security settings', audience: 'candidate' },
  { path: '/app/billing', name: 'billing', audience: 'candidate' },
  { path: '/app/payment-methods', name: 'payment methods', audience: 'candidate' },
  { path: '/app/subscription', name: 'subscription', audience: 'candidate' },
  { path: '/app/upgrade', name: 'upgrade', audience: 'candidate' },
  { path: '/app/company', name: 'company view', audience: 'candidate' },
  { path: '/app/concierge', name: 'concierge', audience: 'candidate' },
  { path: '/app/help', name: 'help', audience: 'candidate' },
  { path: '/app/support', name: 'support', audience: 'candidate' },
  { path: '/app/onboarding', name: 'onboarding', audience: 'candidate' },
  { path: '/profile', name: 'profile', audience: 'candidate' },
  { path: '/resumes', name: 'resumes index', audience: 'candidate' },
  { path: '/applications', name: 'applications', audience: 'candidate' },
];

/** The signed-in employer product. */
export const EMPLOYER_ROUTES: RouteSpec[] = [
  { path: '/employer/dashboard', name: 'dashboard', audience: 'employer' },
  { path: '/employer/jobs', name: 'jobs list', audience: 'employer' },
  { path: '/employer/jobs/post', name: 'post a job', audience: 'employer' },
  { path: '/employer/candidates', name: 'candidates', audience: 'employer' },
  { path: '/employer/interviews', name: 'interviews', audience: 'employer' },
  { path: '/employer/messages', name: 'messages', audience: 'employer' },
  { path: '/employer/approvals', name: 'approvals', audience: 'employer' },
  { path: '/employer/talent-pool', name: 'talent pool', audience: 'employer' },
  { path: '/employer/sourcing', name: 'sourcing', audience: 'employer' },
  { path: '/employer/screening', name: 'screening', audience: 'employer' },
  { path: '/employer/ai-interview', name: 'AI interview', audience: 'employer' },
  { path: '/employer/autopilot', name: 'autopilot', audience: 'employer' },
  { path: '/employer/copilot', name: 'copilot', audience: 'employer' },
  { path: '/employer/distribution', name: 'distribution', audience: 'employer' },
  { path: '/employer/integrations', name: 'integrations', audience: 'employer' },
  { path: '/employer/developer', name: 'developer', audience: 'employer' },
  { path: '/employer/company', name: 'company profile', audience: 'employer' },
  { path: '/employer/profile', name: 'profile', audience: 'employer' },
  { path: '/employer/billing', name: 'billing', audience: 'employer' },
  { path: '/employer/plans', name: 'plans', audience: 'employer' },
  { path: '/employer/usage', name: 'usage', audience: 'employer' },
  { path: '/employer/quota', name: 'quota', audience: 'employer' },
  { path: '/employer/audit', name: 'audit log', audience: 'employer' },
  { path: '/employer/compliance', name: 'compliance', audience: 'employer' },
  { path: '/employer/security', name: 'security', audience: 'employer' },
  { path: '/employer/notifications', name: 'notifications', audience: 'employer' },
  { path: '/employer/onboarding', name: 'onboarding', audience: 'employer' },
];

/**
 * Routes intentionally excluded from the smoke layer, each with a reason.
 *
 * Recording these keeps "not covered" from being mistaken for "covered and
 * passing", which is how a dead page survives a green suite.
 */
export const EXCLUDED_ROUTES: { path: string; reason: string }[] = [
  { path: '/admin/*', reason: 'Needs an admin role; the suite provisions candidate and employer only.' },
  { path: '/agent/*', reason: 'Internal agent console, not part of the shipped product surface.' },
  { path: '/jobs/[id]', reason: 'Dynamic; covered by the candidate journey using a real job id.' },
  { path: '/jobs/apply/[id]', reason: 'Dynamic; covered by the apply journey.' },
  { path: '/employer/jobs/[id]/applications', reason: 'Dynamic; covered by the employer journey.' },
  { path: '/blog/[slug], /blogs/[slug], /customers/[slug], /legal/[doc]', reason: 'Content-driven dynamic routes with no seeded fixtures.' },
  { path: '/resume/preview/[id], /resume/print/[id], /resumes/[id]/edit', reason: 'Dynamic; covered by the resume journey.' },
  { path: '/employer/jobs/post.clean', reason: 'Duplicate of post.jsx left in the tree — should be deleted, not tested.' },
  { path: '/app/states', reason: 'Internal component gallery, not a product route.' },
  { path: '/app/job, /app/application', reason: 'Detail views requiring an id in query; covered by journeys.' },
  { path: '/app/cancel', reason: 'Stripe return URL; reached only mid-checkout.' },
  { path: '/auth/success', reason: 'OAuth callback; cannot be exercised without a real provider round-trip.' },
];

export const ALL_SMOKE_ROUTES = [
  ...PUBLIC_ROUTES,
  ...AUTH_ROUTES,
  ...CANDIDATE_ROUTES,
  ...EMPLOYER_ROUTES,
];
