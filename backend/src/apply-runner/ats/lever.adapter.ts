/**
 * Lever adapter.
 *
 * Like Greenhouse, Lever hosts a public application page with no candidate
 * account, so the full read → fill → submit loop works headlessly.
 *
 * Lever's markup differs in two ways worth knowing: it uses a single `name`
 * field rather than first/last, and it namespaces link fields as
 * `urls[LinkedIn]` / `urls[GitHub]`.
 *
 * SELECTOR STATUS: ported from Lever's public form structure and NOT yet
 * validated against live postings. `scripts/apply-dry-run.ts` is what promotes
 * these from "believed correct" to "measured", and the coverage bar in the spec
 * must be cleared before AUTO_APPLICATION_ENABLED is turned on.
 */
import { HtmlFormAdapter } from './html-form-adapter';

const LEVER_FIELD_SELECTORS: Record<string, string[]> = {
  // Lever asks for one combined name field.
  fullName: ['input[name="name"]', 'input[autocomplete="name"]', '#name'],
  firstName: ['input[name*="first" i]', 'input[autocomplete="given-name"]'],
  lastName: ['input[name*="last" i]', 'input[autocomplete="family-name"]'],
  email: ['input[name="email"]', 'input[type="email"]', 'input[autocomplete="email"]'],
  phone: ['input[name="phone"]', 'input[type="tel"]', 'input[autocomplete="tel"]'],
  location: ['input[name="location"]', 'input[name*="location" i]'],
  linkedin: ['input[name="urls[LinkedIn]"]', 'input[name*="linkedin" i]'],
  github: ['input[name="urls[GitHub]"]', 'input[name*="github" i]'],
};

const LEVER_FILE_SELECTORS = [
  'input[name="resume"]',
  'input[type="file"][name*="resume" i]',
  'input[type="file"]',
];

const LEVER_COVER_LETTER_SELECTORS = [
  'textarea[name="comments"]',
  'textarea[name*="cover" i]',
  'textarea[id*="cover" i]',
];

const LEVER_SUBMIT_SELECTORS = [
  'button[type="submit"]',
  'input[type="submit"]',
  '.postings-btn[type="submit"]',
  '#btn-submit',
];

const LEVER_CONFIRMATION_SELECTORS = [
  '.application-confirmation',
  '.confirmation',
  '.postings-confirmation',
  '[data-qa="confirmation"]',
];

export class LeverAdapter extends HtmlFormAdapter {
  constructor() {
    super({
      atsType: 'lever',
      capabilities: {
        headlessPrepare: true,
        headlessSubmit: true,
        requiresAccount: false,
        multiPage: false,
      },
      fieldSelectors: LEVER_FIELD_SELECTORS,
      fileSelectors: LEVER_FILE_SELECTORS,
      coverLetterSelectors: LEVER_COVER_LETTER_SELECTORS,
      submitSelectors: LEVER_SUBMIT_SELECTORS,
      confirmationSelectors: LEVER_CONFIRMATION_SELECTORS,
    });
  }
}
