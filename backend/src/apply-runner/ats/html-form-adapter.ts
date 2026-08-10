import { Logger } from '@nestjs/common';
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
import {
  detectCaptchaInPage,
  fillFieldsInPage,
  fillFormInPage,
  fillTextareaInPage,
  introspectFormInPage,
  readConfirmationInPage,
  toBuffer,
  uploadResume,
} from './form-dom';

/**
 * Per-ATS configuration. Everything an adapter needs beyond the generic DOM
 * handling in `form-dom.ts`.
 */
export interface HtmlFormAdapterConfig {
  atsType: AtsType;
  capabilities: AtsCapabilities;
  /** Ordered CSS candidates per logical identity field. */
  fieldSelectors: Record<string, string[]>;
  fileSelectors: string[];
  coverLetterSelectors: string[];
  submitSelectors: string[];
  confirmationSelectors: string[];
  navTimeoutMs?: number;
  confirmTimeoutMs?: number;
}

const DEFAULT_NAV_TIMEOUT_MS = 30000;
const DEFAULT_CONFIRM_TIMEOUT_MS = 15000;

/**
 * Base for every ATS that renders an ordinary HTML application form.
 *
 * Greenhouse, Lever and Ashby differ far less than they appear to: all three
 * are HTML forms, so reading and filling them is identical work. What actually
 * varies is which selectors find the résumé input, the submit button, and the
 * confirmation marker — which is all a subclass supplies.
 *
 * The safety posture lives here, once, so no adapter can quietly opt out of it:
 *   - CAPTCHA / anti-bot            -> needsHuman, never bypassed
 *   - No submit button found        -> failReason, never a blind submit
 *   - Clicked but unconfirmed       -> needsHuman, so it is NOT retried and a
 *                                      human verifies rather than risking a
 *                                      duplicate application
 */
export abstract class HtmlFormAdapter implements AtsAdapter {
  protected readonly logger: Logger;

  readonly atsType: AtsType;
  readonly capabilities: AtsCapabilities;

  protected constructor(protected readonly config: HtmlFormAdapterConfig) {
    this.atsType = config.atsType;
    this.capabilities = config.capabilities;
    this.logger = new Logger(`${config.atsType}-adapter`);
  }

  matches(applyUrl: string): boolean {
    return detectAtsType(applyUrl) === this.config.atsType;
  }

  /**
   * This adapter's selector knowledge, for the endpoint that serves it to the
   * browser extension. Exposed deliberately so both runners read one source and
   * cannot drift apart about where a field lives.
   */
  selectorMap() {
    return {
      fields: this.config.fieldSelectors,
      file: this.config.fileSelectors,
      coverLetter: this.config.coverLetterSelectors,
      submit: this.config.submitSelectors,
      confirmation: this.config.confirmationSelectors,
    };
  }

  /** Read the whole form — every field, type and verbatim option. */
  async introspect(ctx: PrepareContext): Promise<FormSchema> {
    const { page, applyUrl } = ctx;

    await page.goto(applyUrl, {
      waitUntil: 'networkidle0',
      timeout: this.config.navTimeoutMs ?? DEFAULT_NAV_TIMEOUT_MS,
    });

    const fields: FormField[] = await page.evaluate(introspectFormInPage);

    return {
      fields,
      fingerprint: computeFormFingerprint(fields),
      url: applyUrl,
      meta: { atsType: this.atsType, fieldCount: fields.length },
    };
  }

  /** Fill from resolved answers, reporting coverage rather than failing hard. */
  async fill(ctx: PrepareContext, answers: Record<string, any>, materials: any): Promise<FillReport> {
    const { page } = ctx;

    const report: FillReport = await page.evaluate(fillFormInPage, answers || {});

    if (materials?.resumeBuffer?.length) {
      const uploaded = await uploadResume(
        page,
        this.config.fileSelectors,
        materials.resumeBuffer,
        materials.resumeFilename,
      );
      if (uploaded) report.filled.push('__resume__');
      else report.skipped.push({ name: '__resume__', reason: 'no file input found' });
    }

    const total = report.filled.length + report.skipped.length;
    report.coverage = total === 0 ? 1 : report.filled.length / total;

    return report;
  }

  /**
   * Fill identity/résumé/cover-letter and submit.
   *
   * Identity filling only touches EMPTY controls, so when this runs after
   * `fill()` in the commit pass it can never overwrite an answer the candidate
   * approved.
   */
  async submit(ctx: SubmitContext): Promise<SubmitResult> {
    const { page, applyUrl, materials } = ctx;
    const screenshots: SubmitScreenshot[] = [];

    await page.goto(applyUrl, {
      waitUntil: 'networkidle0',
      timeout: this.config.navTimeoutMs ?? DEFAULT_NAV_TIMEOUT_MS,
    });

    // 1) Identity text fields (React-controlled → native setter + events).
    const values: Record<string, string> = {};
    for (const field of Object.keys(this.config.fieldSelectors)) {
      const v = (materials as any)?.[field];
      if (typeof v === 'string' && v.trim()) values[field] = v;
    }
    const filledFields = await page.evaluate(fillFieldsInPage, this.config.fieldSelectors, values);

    // 2) Résumé.
    let resumeUploaded = false;
    if (materials?.resumeBuffer?.length) {
      resumeUploaded = await uploadResume(
        page,
        this.config.fileSelectors,
        materials.resumeBuffer,
        materials.resumeFilename,
      );
    }

    // 3) Cover letter (best-effort).
    if (materials?.coverLetter && materials.coverLetter.trim()) {
      await page.evaluate(fillTextareaInPage, this.config.coverLetterSelectors, materials.coverLetter);
    }

    // 4) Proof: the FILLED form, before anything is clicked.
    screenshots.push({
      step: 'before-submit',
      buffer: toBuffer(await page.screenshot({ fullPage: true })),
    });

    // 5) CAPTCHA → abort to a human. Never bypassed.
    if (await page.evaluate(detectCaptchaInPage)) {
      this.logger.warn(`CAPTCHA/anti-bot detected at ${applyUrl} — needs_human`);
      return {
        ok: false,
        needsHuman: true,
        screenshots,
        failReason: 'CAPTCHA / anti-bot challenge detected — manual apply required',
        atsMetadata: { filledFields, resumeUploaded },
      };
    }

    // 6) Locate submit; refuse a blind submit if it is missing.
    let submitSel: string | null = null;
    for (const sel of this.config.submitSelectors) {
      if (await page.$(sel)) {
        submitSel = sel;
        break;
      }
    }
    if (!submitSel) {
      this.logger.warn(`No submit button found at ${applyUrl}`);
      return {
        ok: false,
        screenshots,
        failReason: `Submit button not found on ${this.atsType} form`,
        atsMetadata: { filledFields, resumeUploaded },
      };
    }

    // 7) Submit, then wait for a confirmation marker.
    await page.click(submitSel);
    let confirmed = false;
    try {
      await page.waitForSelector(this.config.confirmationSelectors.join(','), {
        timeout: this.config.confirmTimeoutMs ?? DEFAULT_CONFIRM_TIMEOUT_MS,
      });
      confirmed = true;
    } catch {
      confirmed = false;
    }

    screenshots.push({
      step: 'after-submit',
      buffer: toBuffer(await page.screenshot({ fullPage: true })),
    });

    if (!confirmed) {
      // The click landed but success could not be verified. Reporting ok would
      // risk claiming a submission that never happened; reporting failed would
      // risk a retry submitting twice. Escalate instead.
      return {
        ok: false,
        needsHuman: true,
        screenshots,
        failReason: 'Submit was clicked but no confirmation was detected — manual verification required',
        atsMetadata: { filledFields, resumeUploaded, submitSelector: submitSel },
      };
    }

    const confirmationText = await page.evaluate(
      readConfirmationInPage,
      this.config.confirmationSelectors,
    );

    return {
      ok: true,
      screenshots,
      confirmationText: confirmationText || undefined,
      atsMetadata: { filledFields, resumeUploaded, submitSelector: submitSel },
    };
  }
}
