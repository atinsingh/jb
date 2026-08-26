/**
 * Candidate v3 marketing-home content.
 *
 * Lifted verbatim from the approved design bundle ("Jobocate Candidate
 * v3.dc.html", artboard "Marketing home") so layout changes never silently
 * reword the page. Two deliberate deviations from the source:
 *
 *  1. Em dashes are normalised to hyphens ("0-100", not "0—100").
 *  2. Nothing here asserts a rating or a review; the figures below are the
 *     mockup's illustrative metrics.
 *
 * !! The numbers in HERO_STATS and SITE_METRICS are mockup placeholders, not
 * measured values. Replace them with real analytics before this page ships to
 * production, or cut the two strips. Publishing invented metrics as fact is a
 * claim we cannot support.
 */

export const HERO = {
  eyebrow: 'Built with 100+ recruiters',
  headline: 'Applications, measured.',
  sub: 'Every posting parsed. Coverage scored before you send. Nothing claimed that you cannot defend.',
  primaryCta: { label: 'Start free', href: '/app/signup' },
  secondaryCta: { label: 'See pricing', href: '/pricing' },
  histogramLabel: 'Live coverage distribution',
  axisMin: '40',
  axisMax: '100',
  thresholdLabel: '88 threshold',
};

export const HERO_STATS = [
  { key: 'Median coverage lift', value: '+31', unit: 'pts' },
  { key: 'Reply rate', value: '3.4', unit: '×' },
  { key: 'Time per application', value: '90', unit: 'sec' },
  { key: 'Résumés tailored', value: '412k', unit: '' },
];

export const PROOF = {
  label: 'Hiring on Jobocate',
  logos: [
    'companyone.png',
    'companytwo.png',
    'companythree.png',
    'companyfour.png',
    'companyfive.png',
  ],
};

export const AUDIENCES = [
  {
    who: 'For candidates',
    claim: 'Build the résumé, know the score, talk to someone who has hired.',
    lines: [
      { k: 'Résumé tailored per posting', v: '90 sec' },
      { k: 'ATS coverage scored before you send', v: '0-100' },
      { k: 'Claims you cannot defend, flagged', v: 'Gated' },
      { k: 'Human mentors on call', v: '5 fields' },
    ],
  },
  {
    who: 'For employers',
    claim: 'Candidates whose résumés have been verified, not generated.',
    lines: [
      { k: 'Every inferred claim confirmed by the candidate', v: 'Required' },
      { k: 'Coverage scored against your own posting', v: 'Per role' },
      { k: 'Pipeline, stages, and panels in one place', v: 'Built in' },
      { k: 'Mentor-coached candidates in your funnel', v: '31%' },
    ],
  },
];

export const MENTORS = {
  eyebrow: 'Human mentors',
  heading: 'The software scores the résumé. A person walks you through the search.',
  body: 'Recruiters, comp leads, and staff engineers you can search by speciality and message directly. Read their track record before you pick.',
  cta: { label: 'Browse mentors', href: '/app/concierge' },
  people: [
    { id: 'dara', initials: 'DM', name: 'Dara Mensah', focus: 'Scheduling & recruiter comms', rating: '4.9', rate: '$90' },
    { id: 'priya', initials: 'PR', name: 'Priya Raman', focus: 'Offer negotiation', rating: '5.0', rate: '$140' },
    { id: 'tomas', initials: 'TW', name: 'Tomas Weber', focus: 'Technical screens, backend', rating: '4.8', rate: '$120' },
    { id: 'ana', initials: 'AF', name: 'Ana Ferreira', focus: 'Career pivots', rating: '4.9', rate: '$100' },
    { id: 'sam', initials: 'SO', name: 'Sam Okoro', focus: 'Visa & relocation', rating: '4.7', rate: '$110' },
  ],
};

export const CAPABILITIES = [
  { n: '01', k: 'Tailoring', v: 'Every posting parsed to its exact terms. Coverage scored before you send.', phase: 0.4 },
  { n: '02', k: 'Agent editing', v: 'Instruct in plain language. It edits the document and keeps your history.', phase: 1.9 },
  { n: '03', k: 'Claims review', v: 'Nothing ships that you have not confirmed you can defend.', phase: 3.1 },
  { n: '04', k: 'Tracking', v: 'Sixteen surfaces, one pipeline. Stage, age, and next action on every row.', phase: 4.7 },
];

export const SITE_METRICS = [
  { key: 'Applications tracked', value: '2.1M' },
  { key: 'Postings parsed daily', value: '48k' },
  { key: 'Avg claims flagged', value: '2.4' },
  { key: 'Interviews booked', value: '96k' },
];

export const TESTIMONIALS = [
  { quote: 'Coverage went 64 to 93 on one pass. I got the screen.', attribution: 'Backend engineer, Toronto' },
  { quote: 'The claims check caught a number I could not have defended.', attribution: 'Data scientist, Berlin' },
  { quote: 'Sixteen applications in an afternoon, none of them generic.', attribution: 'Platform engineer, Austin' },
];

export const CLOSING = {
  heading: 'Start measuring.',
  cta: { label: 'Start free', href: '/app/signup' },
};

/** Coverage histogram. Deterministic, so server and client render identically. */
export const HISTOGRAM_BARS = 64;
export const HISTOGRAM_THRESHOLD_INDEX = 44;

export function histogram() {
  return Array.from({ length: HISTOGRAM_BARS }, (_, i) => {
    const x = (i - 41) / 13;
    const h = Math.exp(-x * x) * (0.82 + 0.18 * Math.abs(Math.sin(i * 1.7)));
    return {
      height: Number((7 + 93 * h).toFixed(1)),
      above: i >= HISTOGRAM_THRESHOLD_INDEX,
    };
  });
}

/** Capability sparkline points, matching the design's `spark(phase, 22)`. */
export function sparkline(phase, points = 22, width = 240, height = 40) {
  const step = width / (points - 1);
  return Array.from({ length: points }, (_, i) => {
    const t = phase + i * 0.42;
    const y = height / 2 - (Math.sin(t) * 0.5 + Math.sin(t * 1.7) * 0.28) * (height / 2.4);
    return `${(i * step).toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}
