/**
 * Contract every per-ATS submission adapter implements. The apply-runner drives
 * a Puppeteer `page` to an application form, hands it to the matching adapter,
 * and persists whatever proof + outcome the adapter reports.
 *
 * Adapters are intentionally stateless and Puppeteer-only: they receive an
 * already-open `page` (see {@link SubmitContext}) so the runner owns the browser
 * lifecycle and so adapters are trivially unit-testable against a mock page.
 */
import type { AtsType } from './ats-detect';
import type { SubmissionMaterials } from './submission-materials.type';
import type { FillReport, FormSchema } from '../../answers/form-schema.types';

/** A single screenshot captured during a submission attempt (proof). */
export interface SubmitScreenshot {
  /** Where in the flow it was taken, e.g. 'before-submit' | 'after-submit'. */
  step: string;
  /** Raw PNG bytes. */
  buffer: Buffer;
}

/** Everything an adapter needs to fill + submit one application. */
export interface SubmitContext {
  /**
   * An open Puppeteer `Page`. Typed as `any` so this module never has to import
   * the puppeteer types (it is `require`-loaded at runtime) and so tests can pass
   * a plain mock object.
   */
  page: any;
  /** The resolved apply URL the page should be (or already is) navigated to. */
  applyUrl: string;
  /** Best-effort candidate materials assembled upstream. */
  materials: SubmissionMaterials;
}

/** Outcome of a submission attempt. */
export interface SubmitResult {
  /** True only when the form was submitted AND a confirmation was observed. */
  ok: boolean;
  /**
   * True when the attempt was safely aborted and a human must finish it
   * (CAPTCHA / anti-bot / unconfirmed submit). Never set together with a
   * successful `ok:true`.
   */
  needsHuman?: boolean;
  /** Confirmation text scraped from the success page, when available. */
  confirmationText?: string;
  /** Proof screenshots captured during the attempt (before/after submit). */
  screenshots: SubmitScreenshot[];
  /** Free-form metadata to persist on `application.atsMetadata`. */
  atsMetadata?: Record<string, any>;
  /** Human-readable reason a submission stopped (needs_human / failed). */
  failReason?: string;
}

/**
 * What an adapter is actually able to do.
 *
 * Declared rather than assumed, so one runner can drive four very different
 * platforms without pretending they are the same. Workday, for instance, needs
 * a per-employer account and walks a multi-page wizard, so it prepares answers
 * but hands the submission back to the candidate.
 */
export interface AtsCapabilities {
  /** Can read the form and fill it headlessly. */
  headlessPrepare: boolean;
  /** Can also click submit headlessly. False routes to consent handoff. */
  headlessSubmit: boolean;
  /** Requires a candidate account on the employer's tenant. */
  requiresAccount: boolean;
  /** Walks more than one page before submitting. */
  multiPage: boolean;
}

/** Context for the read/fill halves of the lifecycle. */
export interface PrepareContext {
  page: any;
  applyUrl: string;
}

/** A per-ATS adapter, split along the prepare -> commit lifecycle. */
export interface AtsAdapter {
  /** Which ATS this adapter handles. */
  readonly atsType: AtsType;
  /** What this adapter can and cannot do. */
  readonly capabilities: AtsCapabilities;
  /** True when this adapter can handle the given apply URL. */
  matches(applyUrl: string): boolean;

  /**
   * Read the form into a normalized schema — every field, its type, and its
   * options captured verbatim. Must not modify the page.
   */
  introspect(ctx: PrepareContext): Promise<FormSchema>;

  /**
   * Fill the form from already-resolved answers. Returns what was filled and
   * what was not, so coverage can be tracked and selector rot alarmed on.
   */
  fill(ctx: PrepareContext, answers: Record<string, any>, materials: SubmissionMaterials): Promise<FillReport>;

  /** Fill + submit the application, returning proof and an outcome. */
  submit(ctx: SubmitContext): Promise<SubmitResult>;
}
