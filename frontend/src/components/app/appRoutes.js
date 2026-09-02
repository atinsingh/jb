// Maps every Claude Design ".dc.html" screen name to its Next.js route.
// Single source of truth for cross-screen links across the whole product
// (candidate app, marketing site, and employer surface).
const MAP = {
  // ---- Marketing (public) ----
  'Jobocate Home.dc.html': '/',
  'Pricing.dc.html': '/pricing',
  'About.dc.html': '/about',
  'Browse Jobs.dc.html': '/jobs',
  'For Employers.dc.html': '/employers',
  'Employer Pricing.dc.html': '/employers/pricing',

  // ---- Candidate app (/app/*) ----
  'App Login.dc.html': '/app/login',
  'App Sign Up.dc.html': '/app/signup',
  'App Reset Password.dc.html': '/app/reset-password',
  'App Verify Email.dc.html': '/app/verify-email',
  'App Onboarding.dc.html': '/app/onboarding',
  'App Dashboard.dc.html': '/app/dashboard',
  'App Matches.dc.html': '/app/matches',
  'App Job Profiles.dc.html': '/app/job-profiles',
  'App Job.dc.html': '/app/job',
  'App Apply.dc.html': '/app/apply',
  'App Saved.dc.html': '/app/saved',
  'App Tracker.dc.html': '/app/tracker',
  'App Application Detail.dc.html': '/app/application',
  'App Offers.dc.html': '/app/offers',
  'App Auto-Apply.dc.html': '/app/auto-apply',
  // The editor, the builder stub, the section generator and the LaTeX screen
  // were four routes for one job. They are now the single /app/resume surface,
  // so every design name that used to point at any of them resolves there.
  'App Resume.dc.html': '/app/resume',
  'App Resume Builder.dc.html': '/app/resume',
  'App Resume Generate.dc.html': '/app/resume',
  'App Resume LaTeX.dc.html': '/app/resume',
  'App Resume Library.dc.html': '/app/resume-library',
  'App Cover Letter.dc.html': '/app/cover-letter',
  'App Interview.dc.html': '/app/interview',
  'App Mock Interview.dc.html': '/app/mock-interview',
  'App Live Interview.dc.html': '/app/live-interview',
  'App Concierge.dc.html': '/app/concierge',
  'App Messages.dc.html': '/app/messages',
  'App Company.dc.html': '/app/company',
  'App Notifications.dc.html': '/app/notifications',
  'App Settings.dc.html': '/app/settings',
  'App Account Security.dc.html': '/app/security',
  'App Subscription.dc.html': '/app/subscription',
  'App Billing.dc.html': '/app/billing',
  'App Payment Methods.dc.html': '/app/payment-methods',
  'App Upgrade.dc.html': '/app/upgrade',
  'App Cancel.dc.html': '/app/cancel',
  'App Help Center.dc.html': '/app/help',
  'App Support.dc.html': '/app/support',
  'App States.dc.html': '/app/states',
  // 'Jobocate App Spec.dc.html' removed: it mapped to /app/spec, which has no
  // page file. Anything asking for it now falls through to '/app'.

  // ---- Employer surface (/employer/*) ----
  'EmployerSidebar.dc.html': '/employer/dashboard',
  'Employer Onboarding.dc.html': '/employer/onboarding',
  'Employer Dashboard.dc.html': '/employer/dashboard',
  'Employer Autopilot.dc.html': '/employer/autopilot',
  'Employer Copilot.dc.html': '/employer/copilot',
  'Employer Sourcing Agent.dc.html': '/employer/sourcing',
  'Employer Screening.dc.html': '/employer/screening',
  'Employer AI Interview.dc.html': '/employer/ai-interview',
  'Employer Talent Pool.dc.html': '/employer/talent-pool',
  'Employer Distribution.dc.html': '/employer/distribution',
  'Employer Plans.dc.html': '/employer/plans',
  'Employer Usage.dc.html': '/employer/usage',
  'Employer Billing.dc.html': '/employer/billing',
  'Employer Quota Reached.dc.html': '/employer/quota',
  'Employer Integrations.dc.html': '/employer/integrations',
  'Employer Developer.dc.html': '/employer/developer',
  'Employer Security.dc.html': '/employer/security',
  'Employer Audit Log.dc.html': '/employer/audit',
  'Employer Compliance.dc.html': '/employer/compliance',
  'Employer Req Approval.dc.html': '/employer/approvals',
  'Employer Notifications.dc.html': '/employer/notifications',
  // Core hiring screens not yet redesigned — point at the existing employer pages
  'Employer Jobs.dc.html': '/employer/jobs',
  'Employer Post Job.dc.html': '/employer/jobs/post',
  'Employer Job Detail.dc.html': '/employer/jobs',
  'Employer Candidates.dc.html': '/employer/candidates',
  'Employer Candidate.dc.html': '/employer/candidates',
  'Employer Talent Search.dc.html': '/employer/candidates',
  'Employer Interviews.dc.html': '/employer/interviews',
  'Employer Messages.dc.html': '/employer/messages',
  'Employer Company.dc.html': '/employer/company',
  'Employer Team.dc.html': '/employer/profile',
  'Employer Settings.dc.html': '/employer/profile',
  'Employer Offers.dc.html': '/employer/dashboard',
  'Employer Analytics.dc.html': '/employer/dashboard',
};

export const appRoute = (dc) => {
  const route = MAP[dc];
  if (route) return route;
  // There is no pages/app/index.jsx, so the previous silent '/app' fallback
  // turned a typo'd or retired key into an invisible 404. Fail loudly in
  // development; degrade to the dashboard in production rather than 404.
  if (process.env.NODE_ENV !== 'production') {
    throw new Error(
      'appRoute: unknown screen key "' +
        dc +
        '". Add it to MAP in appRoutes.js, or use a literal path.',
    );
  }
  return '/app/dashboard';
};
