import { Injectable, Logger } from '@nestjs/common';
import { QuestionClass } from '../schemas/question-catalog.schema';
import { DECLINE, WorkAuthStatus } from '../schemas/answer-profile.schema';

/**
 * Map a KNOWN fact onto the option list a specific form offers.
 *
 * Knowing a candidate requires sponsorship in Canada is useless if one posting
 * offers ["Yes", "No"] and the next offers ["I am legally authorized to work in
 * Canada without sponsorship", "I will require sponsorship now or in the
 * future", "Prefer not to say"]. The fact has to land on THIS form's wording.
 *
 * This is a constrained choice, not authorship — the model (when it is needed at
 * all) picks from the employer's own words and never invents the fact behind the
 * choice. Deterministic rules handle the overwhelming majority; anything left
 * below threshold becomes a question for the candidate rather than a guess.
 */

import type { FormOption } from './form-schema.types';

export type { FormOption };

export interface MappingResult {
  option: FormOption;
  confidence: number;
  /** How the mapping was decided, for the review UI and audit. */
  via: 'exact' | 'boolean' | 'work-auth' | 'decline' | 'synonym' | 'model';
}

/**
 * Confidence floors. Attestations are held to a stricter bar because a wrong
 * constrained choice on a work-authorization dropdown is a wrong legal
 * statement, even though no fact was fabricated.
 */
export const CONFIDENCE_FLOOR = {
  attestation: 0.85,
  default: 0.7,
} as const;

export const floorFor = (questionClass: QuestionClass | null): number =>
  questionClass === QuestionClass.ATTESTATION || questionClass === QuestionClass.DEMOGRAPHIC
    ? CONFIDENCE_FLOOR.attestation
    : CONFIDENCE_FLOOR.default;

const norm = (s: string) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const AFFIRMATIVE = ['yes', 'true', 'y', 'i do', 'i am', 'i have'];
const NEGATIVE = ['no', 'false', 'n', 'i do not', 'i dont', 'i am not', 'i have not'];
const DECLINE_WORDS = [
  'decline', 'prefer not', 'rather not', 'do not wish', 'dont wish',
  'not disclose', 'choose not', 'i decline',
];

/** Phrases that mean "authorized, no sponsorship needed". */
const AUTHORIZED_PHRASES = [
  'authorized to work', 'authorised to work', 'legally authorized', 'legally authorised',
  'without sponsorship', 'do not require sponsorship', 'dont require sponsorship',
  'no sponsorship', 'not require sponsorship', 'eligible to work', 'right to work',
];

/** Phrases that mean "will need sponsorship". */
const SPONSORSHIP_PHRASES = [
  'require sponsorship', 'will require', 'need sponsorship', 'now or in the future',
  'require visa', 'need a visa', 'requires sponsorship',
];

@Injectable()
export class OptionMapperService {
  private readonly logger = new Logger(OptionMapperService.name);

  /**
   * Deterministic mapping. Returns null when no rule applies — the caller then
   * decides whether a model attempt is warranted.
   */
  mapDeterministic(value: any, options: FormOption[], questionClass?: QuestionClass | null): MappingResult | null {
    if (!Array.isArray(options) || !options.length) return null;
    if (value === undefined || value === null || value === '') return null;

    const find = (pred: (o: FormOption) => boolean) => options.find(pred);
    const labelOf = (o: FormOption) => norm(o.label || o.value);

    // 1) Exact match on value or label.
    const raw = norm(String(value));
    const exact = find((o) => norm(o.value) === raw || labelOf(o) === raw);
    if (exact) return { option: exact, confidence: 1, via: 'exact' };

    // 2) The candidate declined — only ever map onto an explicit decline option.
    if (String(value) === DECLINE) {
      const declined = find((o) => DECLINE_WORDS.some((d) => labelOf(o).includes(d)));
      return declined ? { option: declined, confidence: 0.95, via: 'decline' } : null;
    }

    // 3) Work authorization — the case that actually matters.
    if (value === WorkAuthStatus.AUTHORIZED || value === WorkAuthStatus.REQUIRES_SPONSORSHIP || value === WorkAuthStatus.NOT_AUTHORIZED) {
      return this.mapWorkAuth(value as WorkAuthStatus, options, labelOf);
    }

    // 4) Booleans.
    if (typeof value === 'boolean') {
      const words = value ? AFFIRMATIVE : NEGATIVE;
      const hit = find((o) => words.includes(labelOf(o)));
      if (hit) return { option: hit, confidence: 0.97, via: 'boolean' };

      const loose = find((o) => words.some((w) => labelOf(o).startsWith(w)));
      if (loose) return { option: loose, confidence: 0.85, via: 'boolean' };
      return null;
    }

    // 5) Substring synonym — the option label contains the answer, or vice versa.
    const contains = find((o) => labelOf(o).includes(raw) || raw.includes(labelOf(o)));
    if (contains) {
      // Weaker signal: only trust it when it is unambiguous.
      const ambiguous = options.filter((o) => labelOf(o).includes(raw) || raw.includes(labelOf(o))).length > 1;
      if (!ambiguous) return { option: contains, confidence: 0.8, via: 'synonym' };
    }

    return null;
  }

  /**
   * Work-authorization mapping.
   *
   * Handles both shapes forms use: the plain Yes/No pair, and the long
   * self-describing sentences. Note the inversion trap — a "do you REQUIRE
   * sponsorship?" question means Yes for a candidate who needs it, while
   * "are you AUTHORIZED?" means No. The phrase test below reads the option
   * text rather than assuming a polarity.
   */
  private mapWorkAuth(
    status: WorkAuthStatus,
    options: FormOption[],
    labelOf: (o: FormOption) => string,
  ): MappingResult | null {
    const authorized = status === WorkAuthStatus.AUTHORIZED;

    const authOption = options.find((o) => AUTHORIZED_PHRASES.some((p) => labelOf(o).includes(p)));
    const sponsorOption = options.find((o) => SPONSORSHIP_PHRASES.some((p) => labelOf(o).includes(p)));

    // Self-describing sentences: pick the one that states the candidate's case.
    if (authorized && authOption && !SPONSORSHIP_PHRASES.some((p) => labelOf(authOption).includes(p))) {
      return { option: authOption, confidence: 0.93, via: 'work-auth' };
    }
    if (!authorized && sponsorOption) {
      return { option: sponsorOption, confidence: 0.93, via: 'work-auth' };
    }

    // Bare Yes/No: ambiguous without knowing the question's polarity, so leave
    // it to the caller (which passes the question text to the model path).
    return null;
  }

  /**
   * Is this mapping trustworthy enough to submit unattended?
   * Below the floor the caller must raise a blocker instead.
   */
  meetsFloor(result: MappingResult | null, questionClass: QuestionClass | null): boolean {
    if (!result) return false;
    return result.confidence >= floorFor(questionClass);
  }
}
