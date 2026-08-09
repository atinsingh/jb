/**
 * Everything a headless ATS adapter needs to fill and submit an application on
 * behalf of a candidate. Assembled by {@link CandidateMaterialsService} and
 * consumed by the per-ATS adapters (2c-B).
 *
 * Every field is best-effort: any piece the assembler cannot resolve is left
 * `undefined` rather than throwing, so an adapter can decide whether a missing
 * field is fatal (→ needs_human) or skippable.
 */
export interface SubmissionMaterials {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;

  /** Raw bytes of the candidate's primary résumé PDF, if one is stored. */
  resumeBuffer?: Buffer;
  /** Suggested upload filename for the résumé (e.g. "Ada_Lovelace_Resume.pdf"). */
  resumeFilename?: string;

  /** Cover-letter text for this specific application, if present. */
  coverLetter?: string;

  /** Pre-answered free-text application questions, keyed by question id/label. */
  answers?: Record<string, string>;
}
