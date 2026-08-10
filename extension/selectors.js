/**
 * Field selector maps for supported ATSes. Kept as a static map for the MVP;
 * the spec calls for serving a versioned map from the backend later so we can
 * patch selector drift without shipping a new extension build.
 *
 * Each logical field lists candidate selectors tried in order; the first match
 * that is empty gets filled. Runs in the same content-script scope as
 * content-ats.js (declared before it in the manifest).
 */
var JOBOCATE_FIELD_SELECTORS = {
  fullName: ['input[name="name"]', 'input[autocomplete="name"]', '#name'],
  firstName: [
    '#first_name',
    'input[name*="first_name" i]',
    'input[autocomplete="given-name"]',
    'input[name="firstName"]',
  ],
  lastName: [
    '#last_name',
    'input[name*="last_name" i]',
    'input[autocomplete="family-name"]',
    'input[name="lastName"]',
  ],
  email: [
    '#email',
    'input[type="email"]',
    'input[name*="email" i]',
    'input[autocomplete="email"]',
  ],
  phone: [
    '#phone',
    'input[type="tel"]',
    'input[name*="phone" i]',
    'input[autocomplete="tel"]',
  ],
  location: [
    'input[name*="location" i]',
    '#location',
    'input[autocomplete="address-level2"]',
  ],
};

function jobocateDetectAts() {
  const h = location.hostname;
  if (h.includes('greenhouse.io')) return 'greenhouse';
  if (h.includes('lever.co')) return 'lever';
  return 'unknown';
}
