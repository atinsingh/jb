/**
 * Greenhouse adapter.
 *
 * Greenhouse hosts a single public application page with no candidate account,
 * which makes it the most tractable of the supported platforms: it can be read,
 * filled and submitted headlessly end to end.
 *
 * Selector knowledge is ported from the browser extension
 * (extension/selectors.js + extension/content-ats.js) so the two runners agree
 * about where fields live. All generic form handling — introspection, filling,
 * CAPTCHA detection, the submit gates — lives in {@link HtmlFormAdapter}.
 */
import { HtmlFormAdapter } from './html-form-adapter';

/**
 * Ordered CSS candidates per logical field, ported from the extension's
 * `JOBOCATE_FIELD_SELECTORS`.
 */
const GH_FIELD_SELECTORS: Record<string, string[]> = {
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
  email: ['#email', 'input[type="email"]', 'input[name*="email" i]', 'input[autocomplete="email"]'],
  phone: ['#phone', 'input[type="tel"]', 'input[name*="phone" i]', 'input[autocomplete="tel"]'],
  location: [
    'input[name*="location" i]',
    '#location',
    'input[autocomplete="address-level2"]',
  ],
};

/** Résumé file-input candidates on Greenhouse. */
const GH_FILE_SELECTORS = [
  'input[type="file"][name*="resume" i]',
  '#resume',
  '#s3_upload_for_resume input[type="file"]',
  'input[type="file"]',
];

/** Cover-letter textarea candidates. */
const GH_COVER_LETTER_SELECTORS = [
  '#cover_letter_text',
  'textarea[name*="cover" i]',
  'textarea[id*="cover" i]',
];

/** Submit-button candidates. */
const GH_SUBMIT_SELECTORS = [
  '#submit_app',
  'input[type="submit"]',
  'button[type="submit"]',
  'button#submit_app',
];

/** Markers shown after a successful Greenhouse submission. */
const GH_CONFIRMATION_SELECTORS = [
  '#application_confirmation',
  '#application_confirmation_header',
  '.application-confirmation',
  '#confirmation',
];

export class GreenhouseAdapter extends HtmlFormAdapter {
  constructor() {
    super({
      atsType: 'greenhouse',
      capabilities: {
        headlessPrepare: true,
        headlessSubmit: true,
        requiresAccount: false,
        multiPage: false,
      },
      fieldSelectors: GH_FIELD_SELECTORS,
      fileSelectors: GH_FILE_SELECTORS,
      coverLetterSelectors: GH_COVER_LETTER_SELECTORS,
      submitSelectors: GH_SUBMIT_SELECTORS,
      confirmationSelectors: GH_CONFIRMATION_SELECTORS,
    });
  }
}
