/**
 * Single source of truth for reading the job-preferences document.
 *
 * Every screen that displays preferences (the editor at /app/preferences and
 * the summary on /app/settings) reads through here. That is deliberate: the two
 * screens previously each hard-coded their own field names, Settings guessed
 * wrong on three of four (`jobTitles`/`workArrangement`/`seniority` against a
 * schema that stores `titles`/`workplaceTypes` and has no seniority concept),
 * and every value silently rendered as "not set". Keeping the field names in
 * exactly one module makes that failure impossible rather than merely fixed.
 *
 * Field names here must match backend/src/schemas/user-preferences.schema.ts.
 */

/* ------------------------------------------------------------- vocabularies */
export const COUNTRIES = [
  ['US', 'United States'], ['CA', 'Canada'], ['GB', 'United Kingdom'], ['IN', 'India'],
  ['IE', 'Ireland'], ['DE', 'Germany'], ['FR', 'France'], ['NL', 'Netherlands'],
  ['ES', 'Spain'], ['AU', 'Australia'], ['NZ', 'New Zealand'], ['SG', 'Singapore'],
  ['AE', 'United Arab Emirates'], ['BR', 'Brazil'], ['MX', 'Mexico'], ['JP', 'Japan'], ['EU', 'European Union'],
];
export const WORKPLACES = [['remote', 'Remote'], ['hybrid', 'Hybrid'], ['onsite', 'On-site'], ['field', 'Field-based']];
export const REMOTE_SCOPES = [['current_country', 'My country only'], ['selected_countries', 'Selected countries'], ['global', 'Global'], ['timezone', 'Time-zone compatible']];
export const EMPLOYMENTS = [['full_time', 'Full-time'], ['part_time', 'Part-time'], ['contract', 'Contract'], ['contract_to_hire', 'Contract-to-hire'], ['temporary', 'Temporary'], ['internship', 'Internship'], ['freelance', 'Freelance']];
export const CURRENCIES = ['USD', 'CAD', 'GBP', 'EUR', 'INR', 'AUD', 'SGD'];
export const PERIODS = [['year', '/ year'], ['month', '/ month'], ['day', '/ day'], ['hour', '/ hour']];
export const REVIEW_MODES = [['review_all', 'Review every application'], ['review_questions', 'Review only when questions'], ['none', 'No review (strictest rules apply)']];
export const WORKAUTH_SUGGEST = ['US', 'EU', 'GB', 'CA'];

/* ------------------------------------------------------------------ helpers */
export const arr = (v) => (Array.isArray(v) ? v : []);

const labelOf = (options, key) => (options.find(([k]) => k === key) || [])[1];

export const countryName = (iso) => labelOf(COUNTRIES, iso) || iso;

const labelList = (options, values) => arr(values).map((v) => labelOf(options, v)).filter(Boolean);

/**
 * Join display parts, dropping blanks and case-insensitive repeats. A user who
 * lists "Remote" as a preferred location *and* ticks the Remote workplace type
 * would otherwise read "Toronto · Remote · Remote · Hybrid".
 */
const join = (parts) => {
  const seen = new Set();
  return parts
    .filter(Boolean)
    .filter((part) => {
      const k = String(part).trim().toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .join(' · ');
};

/**
 * "CAD 180,000+ / year". Currency-aware — the old Settings mirror hard-coded a
 * dollar sign and reported a CAD salary as USD.
 */
export function formatSalary(prefs) {
  const p = prefs || {};
  if (!(p.salaryMin > 0)) return '';
  const amount = Number(p.salaryMin).toLocaleString();
  const period = labelOf(PERIODS, p.salaryPeriod || 'year') || '';
  return `${p.salaryCurrency || 'USD'} ${amount}+ ${period}`.trim();
}

/** Compact variant for tight rows: "CAD 180k+". */
export function formatSalaryCompact(prefs) {
  const p = prefs || {};
  if (!(p.salaryMin > 0)) return '';
  const n = Number(p.salaryMin);
  const amount = n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
  return `${p.salaryCurrency || 'USD'} ${amount}+`;
}

/* ---------------------------------------------------------------- summaries */
/**
 * Display strings for each preference group. Every value is '' when the user
 * has not set it — callers supply their own placeholder, so the editor can say
 * "Where do you want to work?" while Settings offers "Add locations ›".
 */
export function summarizePreferences(prefs) {
  const p = prefs || {};
  return {
    locations: join([
      p.country ? countryName(p.country) : null,
      ...arr(p.locations),
      ...labelList(WORKPLACES, p.workplaceTypes),
    ]),
    workplace: join(labelList(WORKPLACES, p.workplaceTypes)),
    workAuth: join(arr(p.workAuthCountries).map(countryName)),
    roles: join(arr(p.titles)),
    industries: join(arr(p.preferredIndustries)),
    compensation: join([formatSalary(p), ...labelList(EMPLOYMENTS, p.employmentTypes)]),
    salary: formatSalary(p),
    salaryCompact: formatSalaryCompact(p),
    employment: join(labelList(EMPLOYMENTS, p.employmentTypes)),
    autoApply: p.autoApplyEnabled
      ? `On · min ${p.autoApplyMinScore ?? 85}% · ${p.autoApplyMaxDaily ?? 10}/day`
      : '',
    recommendations: `Only show roles matching at least ${p.minMatchScore ?? 60}%.`,
  };
}

/**
 * Which preferences are set, how complete the set is, and what is still
 * blocking eligible recommendations or safe auto-apply.
 */
export function preferenceReadiness(prefs) {
  const p = prefs || {};
  const hasCountry = !!p.country || arr(p.locations).length > 0;
  const hasWorkAuth = arr(p.workAuthCountries).length > 0;
  const hasRoles = arr(p.titles).length > 0;
  const hasArrangement = arr(p.workplaceTypes).length > 0;
  const hasSalary = p.salaryMin > 0;
  const hasIndustries = arr(p.preferredIndustries).length > 0;

  const checks = [hasCountry, hasWorkAuth, hasRoles, hasArrangement, hasSalary, hasIndustries];
  const completeness = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  const missingCritical = [!hasWorkAuth && 'work authorization', !hasCountry && 'location'].filter(Boolean);

  return {
    completeness,
    missingCritical,
    hasCountry, hasWorkAuth, hasRoles, hasArrangement, hasSalary, hasIndustries,
    matchReady: hasCountry && (hasRoles || arr(p.locations).length > 0),
    autoApplyReady: hasCountry && hasWorkAuth && hasRoles,
    autoApplyOn: !!p.autoApplyEnabled,
  };
}

/**
 * The rows /app/settings shows as a read-only summary. Derived from the same
 * strings the editor renders, so the two screens cannot disagree.
 */
export function preferenceSummaryRows(prefs) {
  const s = summarizePreferences(prefs);
  return [
    { key: 'roles', label: 'Target roles', desc: 'Titles we match and apply to', value: s.roles },
    { key: 'locations', label: 'Locations & arrangement', desc: 'Where you want to work', value: s.locations },
    { key: 'workAuth', label: 'Work authorization', desc: 'Required before auto-apply can run', value: s.workAuth },
    { key: 'compensation', label: 'Compensation & type', desc: 'Roles below this are hidden', value: s.compensation },
    { key: 'autoApply', label: 'Auto-apply', desc: 'Applying on your behalf', value: s.autoApply, offLabel: 'Off' },
  ];
}
