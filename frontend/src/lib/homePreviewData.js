/**
 * Illustrative UI preview data for the public homepage.
 *
 * READ BEFORE EDITING
 * -------------------
 * This file exists so that the homepage's product previews have something to
 * render before the public API is wired up. Everything here is SAMPLE UI
 * CONTENT, not a business claim:
 *
 *   - Employers are intentionally fictional. Do not swap in real company names
 *     (Google/Stripe/Meta/…): showing them implies a partnership or placement
 *     record that does not exist. The previous homepage did exactly that.
 *   - There are no aggregate statistics here (applications sent, hire counts,
 *     interview rates). Those were removed because nothing in the project
 *     substantiates them. Do not reintroduce a number here without a source.
 *   - Match scores are illustrative and always ship with their contributing
 *     factors, so the UI never shows an unexplained number.
 *
 * When the jobs API lands, replace `PREVIEW_JOBS` with the response and keep the
 * same shape. Nothing in this file should be imported into shared components —
 * it is homepage-preview scoped on purpose.
 */

/** @typedef {{ label: string, detail: string, weight: 'strong'|'medium'|'weak' }} MatchFactor */

/**
 * @typedef {Object} PreviewJob
 * @property {string} id
 * @property {string} employer          Fictional employer name
 * @property {string} initials
 * @property {boolean} verified         Whether the employer completed verification
 * @property {string} title
 * @property {string} location
 * @property {'Remote'|'Hybrid'|'On-site'} workplace
 * @property {string} type
 * @property {string|null} salary       null when the employer did not supply one
 * @property {string} posted
 * @property {number} match             0–100, always shown with `factors`
 * @property {MatchFactor[]} factors    Why this matched — never show match alone
 */

/** @type {PreviewJob[]} */
export const PREVIEW_JOBS = [
  {
    id: 'j1',
    employer: 'Northwind Studio',
    initials: 'NS',
    verified: true,
    title: 'Senior Product Designer',
    location: 'Berlin, DE',
    workplace: 'Hybrid',
    type: 'Full-time',
    salary: '€72,000 – €88,000',
    posted: '2 days ago',
    match: 94,
    factors: [
      { label: 'Skills', detail: '8 of 9 required skills on your profile', weight: 'strong' },
      { label: 'Experience', detail: '6 yrs vs 5+ requested', weight: 'strong' },
      { label: 'Location', detail: 'Matches your Berlin + hybrid preference', weight: 'medium' },
      { label: 'Salary', detail: 'Above your €70,000 minimum', weight: 'medium' },
    ],
  },
  {
    id: 'j2',
    employer: 'Harbour Analytics',
    initials: 'HA',
    verified: true,
    title: 'Frontend Engineer, Design Systems',
    location: 'Remote (EU)',
    workplace: 'Remote',
    type: 'Full-time',
    salary: '€65,000 – €80,000',
    posted: '4 days ago',
    match: 88,
    factors: [
      { label: 'Skills', detail: 'React, TypeScript, accessibility', weight: 'strong' },
      { label: 'Experience', detail: '6 yrs vs 4+ requested', weight: 'strong' },
      { label: 'Location', detail: 'Remote matches your preference', weight: 'strong' },
      { label: 'Seniority', detail: 'Mid-level posting, you set senior', weight: 'weak' },
    ],
  },
  {
    id: 'j3',
    employer: 'Meridian Health',
    initials: 'MH',
    verified: false,
    title: 'Product Manager, Growth',
    location: 'Amsterdam, NL',
    workplace: 'On-site',
    type: 'Full-time',
    salary: null,
    posted: '9 days ago',
    match: 71,
    factors: [
      { label: 'Skills', detail: '5 of 9 required skills on your profile', weight: 'medium' },
      { label: 'Experience', detail: 'Adjacent field (design → product)', weight: 'medium' },
      { label: 'Location', detail: 'On-site, outside your preferred cities', weight: 'weak' },
      { label: 'Salary', detail: 'Not published by employer', weight: 'weak' },
    ],
  },
];

/** Filters shown in the discovery preview. Mirrors the real /jobs filter set. */
export const PREVIEW_FILTERS = {
  workplace: ['Any', 'Remote', 'Hybrid', 'On-site'],
  type: ['Any', 'Full-time', 'Part-time', 'Contract', 'Internship'],
  experience: ['Any', 'Entry', 'Mid', 'Senior', 'Lead'],
  salary: ['Any', '€40k+', '€60k+', '€80k+', '€100k+'],
  posted: ['Any time', 'Past 24 hours', 'Past week', 'Past month'],
};

/** Candidate hero preview — profile/matching/approval state. */
export const CANDIDATE_PREVIEW = {
  profileComplete: 82,
  profileNext: 'Add 2 portfolio links to reach 100%',
  resumeReady: true,
  resumeNote: 'Tailored for “Senior Product Designer”',
  autoApply: { on: true, reviewRequired: true, dailyCap: 5, usedToday: 3, threshold: 85 },
  pendingApproval: [
    { role: 'Senior Product Designer', employer: 'Northwind Studio', match: 94 },
    { role: 'Frontend Engineer, Design Systems', employer: 'Harbour Analytics', match: 88 },
  ],
  pipeline: [
    { stage: 'Applied', count: 12 },
    { stage: 'In review', count: 5 },
    { stage: 'Interview', count: 2 },
    { stage: 'Offer', count: 0 },
  ],
  interview: { when: 'Thu 14:00', employer: 'Northwind Studio', round: 'Portfolio review' },
};

/**
 * Employer hero preview — ranked candidates.
 * Ranking factors are job-related only (skills, experience, availability).
 * Never rank or explain using protected characteristics.
 */
export const EMPLOYER_PREVIEW = {
  activeJobs: 3,
  qualified: 18,
  timeToShortlist: '2.4 days',
  timeToShortlistNote: 'Median across your 3 open roles',
  candidates: [
    {
      initials: 'AR',
      alias: 'Candidate A · Senior Product Designer',
      match: 94,
      why: 'Design systems + 6 yrs product design; available in 4 weeks',
      stage: 'Shortlisted',
    },
    {
      initials: 'TM',
      alias: 'Candidate B · Product Designer',
      match: 89,
      why: 'Strong portfolio, 4 yrs; needs visa sponsorship',
      stage: 'In review',
    },
    {
      initials: 'JD',
      alias: 'Candidate C · UX Engineer',
      match: 83,
      why: 'Hybrid design/eng background; immediate start',
      stage: 'New',
    },
  ],
  stages: [
    { stage: 'New', count: 18 },
    { stage: 'In review', count: 7 },
    { stage: 'Interview', count: 3 },
    { stage: 'Offer', count: 1 },
  ],
  interview: { when: 'Fri 10:30', who: 'Candidate A', round: 'Team interview' },
};
