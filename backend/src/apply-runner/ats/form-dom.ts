/**
 * Generic form DOM operations, shared by every HTML-form ATS adapter.
 *
 * Reading a form into a schema and filling it back in is the same problem on
 * Greenhouse, Lever and Ashby — they all render ordinary HTML controls. What
 * genuinely differs per ATS is small: which selectors locate the résumé input,
 * the submit button, and the post-submit confirmation. Those live in each
 * adapter; everything here is shared.
 *
 * Functions whose names end in `InPage` are serialized into the browser by
 * `page.evaluate`, so they must be entirely self-contained — no closures over
 * module scope, no imports, no TypeScript-only constructs at runtime.
 */

import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

/* ─────────────────────────── page.evaluate payloads ─────────────────────── */

/**
 * Read every answerable control on the page into a normalized schema.
 *
 * Option labels are captured VERBATIM. Mapping a candidate's known fact onto
 * the employer's own phrasing is the entire job downstream, and paraphrasing
 * their options here would destroy the only signal available.
 */
export function introspectFormInPage(): any[] {
  const SKIP_TYPES = ['hidden', 'submit', 'button', 'reset', 'image'];

  function text(el: any): string {
    return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim();
  }

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

    const wrapper = el.closest(
      '.field, .form-group, fieldset, [class*="field"], [class*="question"], [class*="Field"]',
    );
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
  const seenRadioGroups: Record<string, boolean> = {};
  const controls = Array.from(document.querySelectorAll('input, select, textarea')) as any[];

  for (const el of controls) {
    const tag = (el.tagName || '').toLowerCase();
    const type = (el.type || '').toLowerCase();
    if (tag === 'input' && SKIP_TYPES.indexOf(type) !== -1) continue;

    const name = el.name || el.id;
    if (!name) continue;

    if (type === 'radio') {
      if (seenRadioGroups[name]) continue;
      seenRadioGroups[name] = true;

      const group = Array.from(
        document.querySelectorAll(`input[type="radio"][name="${name}"]`),
      ) as any[];

      // The group's question is the fieldset legend, not any one option's label.
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
      const options = (Array.from(el.options || []) as any[])
        .map((o) => ({ value: o.value, label: text(o) }))
        // Drop the placeholder row — it is not a real choice.
        .filter((o) => o.value !== '' && !/^\s*(select|choose|--)/i.test(o.label));

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
      fields.push({
        name,
        label,
        type: 'file',
        required: isRequired(el, label),
        selector: `input[name="${name}"]`,
      });
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
 * rather than throwing, so one rotted selector does not sink the application —
 * and so coverage can be measured.
 */
export function fillFormInPage(answers: Record<string, any>): any {
  const filled: string[] = [];
  const skipped: Array<{ name: string; reason: string }> = [];

  function setNativeValue(el: any, value: string) {
    // React-controlled inputs ignore a plain `.value =`, so go through the
    // native setter and fire the events the framework listens for.
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
      `select[name="${name}"], textarea[name="${name}"], input[name="${name}"]`,
    ) as any;

    if (!el) {
      skipped.push({ name, reason: 'control not found' });
      continue;
    }

    const tag = (el.tagName || '').toLowerCase();
    const type = (el.type || '').toLowerCase();

    if (tag === 'select') {
      const match = (Array.from(el.options || []) as any[]).find(
        (o) => String(o.value) === String(value),
      );
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
      // Files are uploaded from Node — never from inside the page.
      continue;
    }

    setNativeValue(el, String(value));
    filled.push(name);
  }

  return { filled, skipped, coverage: 0 };
}

/**
 * Fill the first EMPTY matching input per logical field; returns how many were
 * filled.
 *
 * Only touches empty controls on purpose: the submit path runs after the
 * resolved-answer fill, and must never overwrite an answer the candidate
 * actually approved with a generic value from their profile.
 */
export function fillFieldsInPage(
  selectorMap: Record<string, string[]>,
  values: Record<string, string>,
): number {
  function setNativeValue(el: any, value: string) {
    const proto =
      el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
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
export function fillTextareaInPage(selectors: string[], text: string): boolean {
  function setNativeValue(el: any, value: string) {
    const proto =
      el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
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

/** True when a CAPTCHA / anti-bot challenge is present. Never bypassed. */
export function detectCaptchaInPage(): boolean {
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

/** Read confirmation copy from the first matching marker. */
export function readConfirmationInPage(selectors: string[]): string {
  for (const s of selectors) {
    const el = document.querySelector(s) as any;
    if (el) return ((el.innerText || el.textContent || '') as string).trim().slice(0, 500);
  }
  return '';
}

/* ──────────────────────────────── node helpers ──────────────────────────── */

/** First element handle matching any of `selectors`, or null. */
export async function firstHandle(page: any, selectors: string[]): Promise<any | null> {
  for (const sel of selectors) {
    const handle = await page.$(sel);
    if (handle) return handle;
  }
  return null;
}

/** Coerce a screenshot return (Buffer | Uint8Array) into a Buffer. */
export function toBuffer(shot: any): Buffer {
  if (Buffer.isBuffer(shot)) return shot;
  return Buffer.from(shot || []);
}

/** Strip anything unsafe from a suggested résumé filename. */
export function sanitizeFilename(name?: string): string {
  if (!name) return '';
  return name.replace(/[^A-Za-z0-9._-]/g, '_');
}

/**
 * Write a résumé buffer to a real temp file and hand it to a file input.
 *
 * Puppeteer's `uploadFile` needs a path on disk, so this cannot happen inside
 * `page.evaluate`. Always cleans the temp file up.
 */
export async function uploadResume(
  page: any,
  fileSelectors: string[],
  resumeBuffer: Buffer,
  resumeFilename?: string,
): Promise<boolean> {
  const handle = await firstHandle(page, fileSelectors);
  if (!handle) return false;

  const tmpPath = path.join(
    os.tmpdir(),
    `jobocate-resume-${Date.now()}-${Math.random().toString(36).slice(2)}-${
      sanitizeFilename(resumeFilename) || 'resume.pdf'
    }`,
  );

  await fs.writeFile(tmpPath, resumeBuffer);
  try {
    await handle.uploadFile(tmpPath);
    return true;
  } finally {
    await fs.unlink(tmpPath).catch(() => undefined);
  }
}
