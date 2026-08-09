import { QuestionClass } from '../schemas/question-catalog.schema';
import { NormalizedQuestion, matchesPattern } from './question-normalizer';

/**
 * Decide what KIND of question this is, which decides who may answer it.
 *
 * Order matters:
 *   1. A curated catalog entry wins — it is human-reviewed.
 *   2. Otherwise a conservative keyword guard forces risky topics into
 *      ATTESTATION / DEMOGRAPHIC even though no catalog row exists, so a novel
 *      phrasing of "have you ever been convicted" can never be treated as prose.
 *   3. Anything still unidentified returns `null` — UNKNOWN — which the
 *      resolver turns into a blocker for the candidate to answer once.
 *
 * The default is deliberately "ask the human", never "let the model write it".
 * Classifying an unknown question as PROSE would hand a model authorship of
 * something nobody has read, submitted under the candidate's name.
 */

export interface CatalogLike {
  questionKey: string;
  patterns?: string[];
  questionClass: QuestionClass;
  profileField?: string;
  countryScoped?: boolean;
  canonicalText?: string;
}

export interface Classification {
  /** null means UNKNOWN — resolve to a blocker, never to a model. */
  questionClass: QuestionClass | null;
  profileField?: string;
  countryScoped?: boolean;
  /** The catalog key when one matched, else the normalized key. */
  questionKey: string;
  /** True when a curated catalog row decided this. */
  viaCatalog: boolean;
}

/**
 * Topics that must never reach a model even if the catalog has no row for the
 * exact phrasing. These are legal statements and protected characteristics.
 */
const ATTESTATION_GUARD = [
  'authoriz', 'authoris', 'sponsor', 'visa', 'immigration', 'work permit',
  'right work', 'eligible work', 'legally work',
  'convict', 'felony', 'criminal', 'background check',
  'security clearance', 'clearance',
  '18 years', 'least 18', 'over 18', 'age',
  'non compete', 'noncompete', 'restrictive covenant',
  'currently employed', 'worked here before',
];

const DEMOGRAPHIC_GUARD = [
  'gender', 'ethnicity', 'race', 'hispanic', 'latino',
  'veteran', 'disability', 'disabled', 'pronouns',
  'sexual orientation', 'religion', 'marital status',
];

const containsAny = (haystack: string, needles: string[]): boolean =>
  needles.some((n) => haystack.includes(n));

/**
 * Classify one normalized question against the catalog.
 *
 * @param question the normalized question
 * @param catalog  active catalog rows to match against
 */
export function classifyQuestion(
  question: NormalizedQuestion,
  catalog: CatalogLike[] = [],
): Classification {
  // 1) Curated catalog match. Longest pattern wins so "upload cover letter"
  //    (a FILE) beats "cover letter" (PROSE) rather than depending on row order.
  let best: { entry: CatalogLike; length: number } | null = null;
  for (const entry of catalog) {
    for (const pattern of entry.patterns || []) {
      if (matchesPattern(question, pattern) && (!best || pattern.length > best.length)) {
        best = { entry, length: pattern.length };
      }
    }
  }

  if (best) {
    return {
      questionClass: best.entry.questionClass,
      profileField: best.entry.profileField,
      countryScoped: best.entry.countryScoped,
      questionKey: best.entry.questionKey,
      viaCatalog: true,
    };
  }

  // 2) Conservative guard for risky topics the catalog has not seen yet.
  if (containsAny(question.normalized, DEMOGRAPHIC_GUARD)) {
    return {
      questionClass: QuestionClass.DEMOGRAPHIC,
      questionKey: question.key,
      viaCatalog: false,
    };
  }

  if (containsAny(question.normalized, ATTESTATION_GUARD)) {
    return {
      questionClass: QuestionClass.ATTESTATION,
      countryScoped: !!question.country,
      questionKey: question.key,
      viaCatalog: false,
    };
  }

  // 3) Unknown. The candidate answers it once; the answer bank remembers it.
  return {
    questionClass: null,
    questionKey: question.key,
    viaCatalog: false,
  };
}

/** True when this class may only ever be answered by the candidate. */
export function requiresCandidateAnswer(questionClass: QuestionClass | null): boolean {
  return (
    questionClass === QuestionClass.ATTESTATION ||
    questionClass === QuestionClass.DEMOGRAPHIC
  );
}

/** True when a model is permitted to draft an answer for this class. */
export function allowsModelDraft(questionClass: QuestionClass | null): boolean {
  return questionClass === QuestionClass.PROSE;
}
