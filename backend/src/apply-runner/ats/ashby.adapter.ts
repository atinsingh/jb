/**
 * Ashby adapter.
 *
 * Ashby's application pages are public and account-free like Greenhouse and
 * Lever, but the form is a React application whose controls are named with an
 * internal `_systemfield_*` convention and whose custom questions are rendered
 * dynamically.
 *
 * Two consequences:
 *   - Filling MUST go through the native value setter and fire input/change,
 *     which `form-dom` already does — a plain `.value =` is swallowed by React.
 *   - The form often finishes rendering after `networkidle0`, so introspection
 *     can read a partial form. See the risk note below.
 *
 * SELECTOR STATUS: unvalidated against live postings, and the least understood
 * of the three headless adapters. The design spec flags Ashby as the one whose
 * estimate should not be trusted until it has been spiked against real forms —
 * `scripts/apply-dry-run.ts` is how that happens.
 */
import { HtmlFormAdapter } from './html-form-adapter';

const ASHBY_FIELD_SELECTORS: Record<string, string[]> = {
  fullName: ['input[name="_systemfield_name"]', 'input[name="name"]', 'input[autocomplete="name"]'],
  firstName: ['input[name*="first" i]', 'input[autocomplete="given-name"]'],
  lastName: ['input[name*="last" i]', 'input[autocomplete="family-name"]'],
  email: ['input[name="_systemfield_email"]', 'input[type="email"]', 'input[name*="email" i]'],
  phone: ['input[name="_systemfield_phone"]', 'input[type="tel"]', 'input[name*="phone" i]'],
  location: ['input[name="_systemfield_location"]', 'input[name*="location" i]'],
  linkedin: ['input[name*="linkedin" i]'],
  github: ['input[name*="github" i]'],
};

const ASHBY_FILE_SELECTORS = [
  'input[name="_systemfield_resume"]',
  'input[type="file"][name*="resume" i]',
  'input[type="file"]',
];

const ASHBY_COVER_LETTER_SELECTORS = [
  'textarea[name*="cover" i]',
  'textarea[name="_systemfield_coverLetter"]',
  'textarea[id*="cover" i]',
];

const ASHBY_SUBMIT_SELECTORS = [
  'button[type="submit"]',
  'button[data-testid="submit-application"]',
  'input[type="submit"]',
];

const ASHBY_CONFIRMATION_SELECTORS = [
  '[data-testid="application-confirmation"]',
  '.application-confirmation',
  '.ashby-application-form-success',
  '[class*="success" i][class*="application" i]',
];

export class AshbyAdapter extends HtmlFormAdapter {
  constructor() {
    super({
      atsType: 'ashby',
      capabilities: {
        headlessPrepare: true,
        headlessSubmit: true,
        requiresAccount: false,
        multiPage: false,
      },
      fieldSelectors: ASHBY_FIELD_SELECTORS,
      fileSelectors: ASHBY_FILE_SELECTORS,
      coverLetterSelectors: ASHBY_COVER_LETTER_SELECTORS,
      submitSelectors: ASHBY_SUBMIT_SELECTORS,
      confirmationSelectors: ASHBY_CONFIRMATION_SELECTORS,
      // Ashby hydrates late; give navigation longer than the shared default so
      // introspection does not read a half-rendered form and fingerprint it.
      navTimeoutMs: 45000,
    });
  }
}
