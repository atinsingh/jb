/**
 * The contract between an ATS adapter and the answer engine.
 *
 * An adapter INTROSPECTS a real application form into a `FormSchema`; the answer
 * engine CONSUMES it and returns resolved answers plus blockers. Keeping the
 * shape here — rather than in either side — stops the two from drifting and
 * avoids a circular import between `apply-runner` and `answers`.
 */

/** One choice a form offers, captured VERBATIM. */
export interface FormOption {
  /** The value the form submits. */
  value: string;
  /**
   * What the candidate would read, exactly as the employer worded it.
   *
   * Never normalize this. Mapping a known fact onto an employer's own phrasing
   * is the whole job; paraphrasing their options first would destroy the only
   * signal available.
   */
  label: string;
}

/** One field on a real application form. */
export interface FormField {
  /** Form control identifier used to fill it back in. */
  name: string;
  /** The question as displayed to a human. */
  label: string;
  /** text | textarea | select | radio | checkbox | date | number | file */
  type: string;
  required?: boolean;
  /** Present for select/radio/checkbox. Verbatim, in document order. */
  options?: FormOption[];
  maxLength?: number;
  /** CSS selector that located this field, so `fill` can find it again. */
  selector?: string;
}

/** A whole introspected form. */
export interface FormSchema {
  fields: FormField[];
  /**
   * Stable hash of the form's STRUCTURE — field names, types and option values,
   * never their current values. Recomputed before submitting so an application
   * approved yesterday is never submitted against a form that has since changed.
   */
  fingerprint: string;
  /** The URL the schema was read from. */
  url: string;
  /** Anything the adapter wants to carry forward (page count, ATS quirks). */
  meta?: Record<string, any>;
}

/** What actually happened when an adapter filled a form. */
export interface FillReport {
  /** Field names successfully filled. */
  filled: string[];
  /** Field names that could not be filled, with why. */
  skipped: Array<{ name: string; reason: string }>;
  /** filled / (filled + skipped required) — the selector-rot alarm signal. */
  coverage: number;
}
