/**
 * Greenhouse headless submission adapter.
 *
 * Ports the extension's selector + `setNativeValue` knowledge
 * (extension/selectors.js + extension/content-ats.js) to the server so the
 * runner can fill a Greenhouse hosted application form, attach the résumé,
 * screenshot the filled form, and — only when no CAPTCHA is present — submit and
 * confirm.
 *
 * Safety posture (see apply-runner.service for the surrounding gates):
 *   - CAPTCHA / anti-bot challenge  → returns { needsHuman:true }, never bypassed.
 *   - Missing submit button         → returns { ok:false, failReason } (no blind submit).
 *   - Submit clicked but no confirmation observed → { needsHuman:true } so the app
 *     is NOT retried/re-submitted (idempotency) and a human verifies it instead.
 *
 * Puppeteer is only ever touched through the injected `page` in
 * {@link SubmitContext}, which keeps this class unit-testable with a mock page.
 */
import { Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { AtsType } from './ats-detect';
import { detectAtsType } from './ats-detect';
import type {
  AtsAdapter,
  AtsCapabilities,
  PrepareContext,
  SubmitContext,
  SubmitResult,
  SubmitScreenshot,
} from './ats-adapter.interface';
import type { FillReport, FormField, FormSchema } from '../../answers/form-schema.types';
import { computeFormFingerprint } from './form-fingerprint';

/**
 * Ordered CSS candidate selectors per logical field, ported from the extension's
 * `JOBOCATE_FIELD_SELECTORS`. Kept as a small map so a Lever adapter can adopt
 * the same shape later.
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

/** Confirmation markers shown after a successful Greenhouse submission. */
const GH_CONFIRMATION_SELECTORS = [
  '#application_confirmation',
  '#application_confirmation_header',
  '.application-confirmation',
  '#confirmation',
];

const NAV_TIMEOUT_MS = 30000;
const CONFIRM_TIMEOUT_MS = 15000;

export class GreenhouseAdapter implements AtsAdapter {
  readonly atsType: AtsType = 'greenhouse';

  /** Greenhouse hosts a single public page with no account required. */
  readonly capabilities: AtsCapabilities = {
    headlessPrepare: true,
    headlessSubmit: true,
    requiresAccount: false,
    multiPage: false,
  };

  private readonly logger = new Logger(GreenhouseAdapter.name);

  matches(applyUrl: string): boolean {
    return detectAtsType(applyUrl) === 'greenhouse';
  }

  /**
   * Read the whole form — not just the six identity fields the submit path
   * knows about. Real postings carry required custom questions (work
   * authorization, sponsorship, years of experience, "why us") plus an EEO
   * block, and none of that can be answered without first seeing it.
   *
   * Options are captured verbatim: mapping a candidate's known fact onto the
   * employer's own wording is the entire job downstream.
   */
  async introspect(ctx: PrepareContext): Promise<FormSchema> {
    const { page, applyUrl } = ctx;

    await page.goto(applyUrl, { waitUntil: 'networkidle0', timeout: NAV_TIMEOUT_MS });

    const fields: FormField[] = await page.evaluate(introspectFormInPage);

    return {
      fields,
      fingerprint: computeFormFingerprint(fields),
      url: applyUrl,
      meta: { atsType: this.atsType, fieldCount: fields.length },
    };
  }

  /**
   * Fill from resolved answers, keyed by field name. Reports what it could not
   * fill rather than failing the whole application — a low coverage number is
   * the signal that Greenhouse changed their markup and the selectors rotted.
   */
  async fill(
    ctx: PrepareContext,
    answers: Record<string, any>,
    materials: any,
  ): Promise<FillReport> {
    const { page } = ctx;

    const report: FillReport = await page.evaluate(fillFormInPage, answers || {});

    // Résumé upload is a real OS file, so it cannot happen inside page.evaluate.
    if (materials?.resumeBuffer?.length) {
      const handle = await firstHandle(page, GH_FILE_SELECTORS);
      if (handle) {
        const tmpPath = path.join(
          os.tmpdir(),
          `jobocate-resume-${Date.now()}-${Math.random().toString(36).slice(2)}-${
            sanitizeFilename(materials.resumeFilename) || 'resume.pdf'
          }`,
        );
        await fs.writeFile(tmpPath, materials.resumeBuffer);
        try {
          await handle.uploadFile(tmpPath);
          report.filled.push('__resume__');
        } finally {
          await fs.unlink(tmpPath).catch(() => undefined);
        }
      } else {
        report.skipped.push({ name: '__resume__', reason: 'no file input found' });
      }
    }

    const requiredMisses = report.skipped.length;
    const total = report.filled.length + requiredMisses;
    report.coverage = total === 0 ? 1 : report.filled.length / total;

    return report;
  }

  async submit(ctx: SubmitContext): Promise<SubmitResult> {
    const { page, applyUrl, materials } = ctx;
    const screenshots: SubmitScreenshot[] = [];
    const tmpFiles: string[] = [];

    try {
      await page.goto(applyUrl, { waitUntil: 'networkidle0', timeout: NAV_TIMEOUT_MS });

      // 1) Fill identity text fields (React-controlled → native setter + events).
      const values: Record<string, string> = {};
      for (const field of Object.keys(GH_FIELD_SELECTORS)) {
        const v = (materials as any)[field];
        if (typeof v === 'string' && v.trim()) values[field] = v;
      }
      const filledFields = await page.evaluate(fillFieldsInPage, GH_FIELD_SELECTORS, values);

      // 2) Résumé upload via a real OS tmp file (cleaned up in finally).
      let resumeUploaded = false;
      if (materials.resumeBuffer && materials.resumeBuffer.length) {
        const handle = await firstHandle(page, GH_FILE_SELECTORS);
        if (handle) {
          const tmpPath = path.join(
            os.tmpdir(),
            `jobocate-resume-${Date.now()}-${Math.random().toString(36).slice(2)}-${
              sanitizeFilename(materials.resumeFilename) || 'resume.pdf'
            }`,
          );
          await fs.writeFile(tmpPath, materials.resumeBuffer);
          tmpFiles.push(tmpPath);
          await handle.uploadFile(tmpPath);
          resumeUploaded = true;
        }
      }

      // 3) Cover letter textarea (best-effort).
      if (materials.coverLetter && materials.coverLetter.trim()) {
        await page.evaluate(fillTextareaInPage, GH_COVER_LETTER_SELECTORS, materials.coverLetter);
      }

      // 4) Proof: screenshot the FILLED form BEFORE clicking submit.
      screenshots.push({ step: 'before-submit', buffer: toBuffer(await page.screenshot({ fullPage: true })) });

      // 5) CAPTCHA / anti-bot → abort to a human. Never bypass.
      if (await page.evaluate(detectCaptchaInPage)) {
        this.logger.warn(`Greenhouse: CAPTCHA/anti-bot detected at ${applyUrl} — needs_human`);
        return {
          ok: false,
          needsHuman: true,
          screenshots,
          failReason: 'CAPTCHA / anti-bot challenge detected — manual apply required',
          atsMetadata: { filledFields, resumeUploaded },
        };
      }

      // 6) Locate the submit button; refuse a blind submit if it is missing.
      let submitSel: string | null = null;
      for (const sel of GH_SUBMIT_SELECTORS) {
        if (await page.$(sel)) {
          submitSel = sel;
          break;
        }
      }
      if (!submitSel) {
        this.logger.warn(`Greenhouse: no submit button found at ${applyUrl}`);
        return {
          ok: false,
          screenshots,
          failReason: 'Submit button not found on Greenhouse form',
          atsMetadata: { filledFields, resumeUploaded },
        };
      }

      // 7) Submit and wait for a confirmation marker.
      await page.click(submitSel);
      let confirmed = false;
      try {
        await page.waitForSelector(GH_CONFIRMATION_SELECTORS.join(','), { timeout: CONFIRM_TIMEOUT_MS });
        confirmed = true;
      } catch {
        confirmed = false;
      }

      // 8) Proof: screenshot AFTER the submit attempt regardless of outcome.
      screenshots.push({ step: 'after-submit', buffer: toBuffer(await page.screenshot({ fullPage: true })) });

      if (!confirmed) {
        // The click landed but we could not verify success. Do NOT report ok
        // (that would risk nothing) nor failed (that would risk a re-submit).
        // Escalate to a human to verify — safest idempotent choice.
        return {
          ok: false,
          needsHuman: true,
          screenshots,
          failReason: 'Submit was clicked but no confirmation was detected — manual verification required',
          atsMetadata: { filledFields, resumeUploaded, submitSelector: submitSel },
        };
      }

      const confirmationText = await page.evaluate(readConfirmationInPage, GH_CONFIRMATION_SELECTORS);
      return {
        ok: true,
        screenshots,
        confirmationText: confirmationText || undefined,
        atsMetadata: { filledFields, resumeUploaded, submitSelector: submitSel },
      };
    } finally {
      await Promise.all(
        tmpFiles.map((f) => fs.unlink(f).catch(() => undefined)),
      );
    }
  }
}

// ── page.evaluate payloads (serialized into the browser; keep self-contained) ──

/** Fill the first empty matching input per field; returns how many were filled. */
function fillFieldsInPage(selectorMap: Record<string, string[]>, values: Record<string, string>): number {
  function setNativeValue(el: any, value: string) {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  let count = 0;
  for (const field of Object.keys(values)) {
    const selectors = selectorMap[field] || [];
    for (const sel of selectors) {
      const el = document.querySelector(sel) as any;
      if (el && !el.value) {
        setNativeValue(el, values[field]);
        count += 1;
        break;
      }
    }
  }
  return count;
}

/** Fill the first matching textarea with `text`. */
function fillTextareaInPage(selectors: string[], text: string): boolean {
  function setNativeValue(el: any, value: string) {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  for (const sel of selectors) {
    const el = document.querySelector(sel) as any;
    if (el) {
      setNativeValue(el, text);
      return true;
    }
  }
  return false;
}

/** True when a CAPTCHA / anti-bot challenge is present. */
function detectCaptchaInPage(): boolean {
  const selectors = [
    'iframe[src*="recaptcha"]',
    '.g-recaptcha',
    '#g-recaptcha',
    'iframe[src*="hcaptcha"]',
    '.h-captcha',
    'iframe[title*="captcha" i]',
    '#challenge-running',
    '#cf-challenge-running',
    '.cf-challenge',
  ];
  for (const s of selectors) {
    if (document.querySelector(s)) return true;
  }
  const text = ((document.body && document.body.innerText) || '').toLowerCase();
  return (
    text.includes('captcha') ||
    text.includes('verify you are human') ||
    text.includes('are you a robot') ||
    text.includes('checking your browser')
  );
}

/**
 * Read every answerable control on the page into a normalized schema.
 *
 * Runs inside the browser, so it must stay entirely self-contained — no
 * closures over Node scope, no imports.
 */
function introspectFormInPage(): any[] {
  const SKIP_TYPES = ['hidden', 'submit', 'button', 'reset', 'image'];

  function text(el: any): string {
    return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim();
  }

  /** Best-effort human label for a control. */
  function labelFor(el: any): string {
    if (el.id) {
      try {
        const explicit = document.querySelector(`label[for="${(window as any).CSS.escape(el.id)}"]`);
        if (explicit && text(explicit)) return text(explicit);
      } catch {
        /* CSS.escape unavailable — fall through */
      }
    }
    const ancestor = el.closest('label');
    if (ancestor && text(ancestor)) return text(ancestor);

    const wrapper = el.closest('.field, .form-group, fieldset, [class*="field"], [class*="question"]');
    if (wrapper) {
      const l = wrapper.querySelector('label, legend');
      if (l && text(l)) return text(l);
    }
    return el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.name || el.id || '';
  }

  function isRequired(el: any, label: string): boolean {
    if (el.required) return true;
    if (el.getAttribute('aria-required') === 'true') return true;
    return /\*\s*$/.test(label) || /\(required\)/i.test(label);
  }

  const fields: any[] = [];
  const seenRadioGroups = new Set<string>();

  const controls = Array.from(
    document.querySelectorAll('input, select, textarea'),
  ) as any[];

  for (const el of controls) {
    const tag = (el.tagName || '').toLowerCase();
    const type = (el.type || '').toLowerCase();
    if (tag === 'input' && SKIP_TYPES.indexOf(type) !== -1) continue;

    const name = el.name || el.id;
    if (!name) continue;

    // ---- radio groups collapse into one field with options ----
    if (type === 'radio') {
      if (seenRadioGroups.has(name)) continue;
      seenRadioGroups.add(name);

      const group = Array.from(
        document.querySelectorAll(`input[type="radio"][name="${name}"]`),
      ) as any[];

      // The group's question is the fieldset legend, not any single option.
      const fieldset = el.closest('fieldset, .field, [class*="question"]');
      const legend = fieldset && fieldset.querySelector('legend, label');
      const groupLabel = (legend && text(legend)) || name;

      fields.push({
        name,
        label: groupLabel,
        type: 'radio',
        required: group.some((r) => isRequired(r, groupLabel)),
        options: group.map((r) => ({ value: r.value, label: labelFor(r) || r.value })),
        selector: `input[type="radio"][name="${name}"]`,
      });
      continue;
    }

    const label = labelFor(el);

    if (tag === 'select') {
      const options = Array.from(el.options || [])
        .map((o: any) => ({ value: o.value, label: text(o) }))
        // Drop the placeholder row — it is not a real choice.
        .filter((o: any) => o.value !== '' && !/^\s*(select|choose|--)/i.test(o.label));

      fields.push({
        name,
        label,
        type: 'select',
        required: isRequired(el, label),
        options,
        selector: `select[name="${name}"]`,
      });
      continue;
    }

    if (type === 'file') {
      fields.push({ name, label, type: 'file', required: isRequired(el, label), selector: `input[name="${name}"]` });
      continue;
    }

    if (type === 'checkbox') {
      fields.push({
        name,
        label,
        type: 'checkbox',
        required: isRequired(el, label),
        selector: `input[type="checkbox"][name="${name}"]`,
      });
      continue;
    }

    const maxLength = Number(el.maxLength) > 0 ? Number(el.maxLength) : undefined;
    fields.push({
      name,
      label,
      type: tag === 'textarea' ? 'textarea' : type || 'text',
      required: isRequired(el, label),
      maxLength,
      selector: `${tag}[name="${name}"]`,
    });
  }

  return fields;
}

/**
 * Fill controls from `{ fieldName: value }`. Reports what it could not fill
 * instead of throwing, so one rotted selector does not sink the application.
 */
function fillFormInPage(answers: Record<string, any>): any {
  const filled: string[] = [];
  const skipped: Array<{ name: string; reason: string }> = [];

  function setNativeValue(el: any, value: string) {
    const proto =
      el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  for (const name of Object.keys(answers || {})) {
    const value = answers[name];
    if (value === undefined || value === null) continue;

    const radios = Array.from(
      document.querySelectorAll(`input[type="radio"][name="${name}"]`),
    ) as any[];

    if (radios.length) {
      const hit = radios.find((r) => String(r.value) === String(value));
      if (hit) {
        hit.click();
        filled.push(name);
      } else {
        skipped.push({ name, reason: `no radio option with value "${value}"` });
      }
      continue;
    }

    const el = document.querySelector(
      `select[name="${name}"], textarea[name="${name}"], input[name="${name}"], #${name}`,
    ) as any;

    if (!el) {
      skipped.push({ name, reason: 'control not found' });
      continue;
    }

    const tag = (el.tagName || '').toLowerCase();
    const type = (el.type || '').toLowerCase();

    if (tag === 'select') {
      const match = Array.from(el.options || []).find(
        (o: any) => String(o.value) === String(value),
      ) as any;
      if (!match) {
        skipped.push({ name, reason: `no option with value "${value}"` });
        continue;
      }
      el.value = match.value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      filled.push(name);
      continue;
    }

    if (type === 'checkbox') {
      const want = value === true || value === 'true' || value === 'yes';
      if (el.checked !== want) el.click();
      filled.push(name);
      continue;
    }

    if (type === 'file') {
      // Files are uploaded from Node — never from here.
      continue;
    }

    setNativeValue(el, String(value));
    filled.push(name);
  }

  return { filled, skipped, coverage: 0 };
}

/** Read confirmation copy from the first matching marker. */
function readConfirmationInPage(selectors: string[]): string {
  for (const s of selectors) {
    const el = document.querySelector(s) as any;
    if (el) return ((el.innerText || el.textContent || '') as string).trim().slice(0, 500);
  }
  return '';
}

// ── local helpers ─────────────────────────────────────────────────────────────

/** Return the first element handle matching any of `selectors`, or null. */
async function firstHandle(page: any, selectors: string[]): Promise<any | null> {
  for (const sel of selectors) {
    const handle = await page.$(sel);
    if (handle) return handle;
  }
  return null;
}

/** Coerce a screenshot return (Buffer | Uint8Array) into a Buffer. */
function toBuffer(shot: any): Buffer {
  if (Buffer.isBuffer(shot)) return shot;
  return Buffer.from(shot || []);
}

/** Strip anything unsafe from a suggested résumé filename. */
function sanitizeFilename(name?: string): string {
  if (!name) return '';
  return name.replace(/[^A-Za-z0-9._-]/g, '_');
}
