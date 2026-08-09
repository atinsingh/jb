import { classifyQuestion, requiresCandidateAnswer, allowsModelDraft } from './question-classifier';
import { normalizeQuestion } from './question-normalizer';
import { QuestionClass } from '../schemas/question-catalog.schema';
import { QUESTION_CATALOG_SEED } from './question-catalog.seed';

const classify = (raw: string, company?: string) =>
  classifyQuestion(normalizeQuestion(raw, company), QUESTION_CATALOG_SEED);

describe('classifyQuestion', () => {
  describe('via the seeded catalog', () => {
    it('classifies work authorization as an attestation, country-scoped', () => {
      const c = classify('Are you legally authorized to work in the United States?');

      expect(c.questionClass).toBe(QuestionClass.ATTESTATION);
      expect(c.questionKey).toBe('work-authorization');
      expect(c.countryScoped).toBe(true);
      expect(c.viaCatalog).toBe(true);
    });

    it('classifies sponsorship as an attestation', () => {
      expect(classify('Will you now or in the future require visa sponsorship?').questionClass).toBe(
        QuestionClass.ATTESTATION,
      );
    });

    it('classifies EEO questions as demographic', () => {
      expect(classify('Gender').questionClass).toBe(QuestionClass.DEMOGRAPHIC);
      expect(classify('Veteran status').questionClass).toBe(QuestionClass.DEMOGRAPHIC);
      expect(classify('Disability status').questionClass).toBe(QuestionClass.DEMOGRAPHIC);
    });

    it('classifies salary and notice as preferences', () => {
      expect(classify('What is your expected salary?').questionClass).toBe(QuestionClass.PREFERENCE);
      expect(classify('Notice period').questionClass).toBe(QuestionClass.PREFERENCE);
    });

    it('classifies "why do you want to work here" as prose', () => {
      const c = classify('Why do you want to work at Acme?', 'Acme');

      expect(c.questionClass).toBe(QuestionClass.PROSE);
      expect(c.questionKey).toBe('why-company');
    });

    it('classifies identity fields', () => {
      expect(classify('First name').questionClass).toBe(QuestionClass.IDENTITY);
      expect(classify('LinkedIn profile URL').questionClass).toBe(QuestionClass.IDENTITY);
    });

    // Longest-pattern-wins: "upload cover letter" (FILE) must beat the shorter
    // "cover letter" (PROSE) regardless of seed order.
    it('prefers the most specific pattern', () => {
      expect(classify('Upload cover letter').questionClass).toBe(QuestionClass.FILE);
      expect(classify('Cover letter').questionClass).toBe(QuestionClass.PROSE);
    });
  });

  describe('conservative guard for uncatalogued risky topics', () => {
    it('catches a conviction phrasing the catalog does cover', () => {
      // 'felony' is a seeded pattern, so this resolves via the catalog.
      const c = classify('Have you ever pleaded guilty to a felony offence?');

      expect(c.questionClass).toBe(QuestionClass.ATTESTATION);
      expect(c.viaCatalog).toBe(true);
    });

    it('catches a conviction phrasing the catalog does NOT cover', () => {
      // "criminal history" matches no seeded pattern — only the guard saves it.
      const c = classify('Do you have any criminal history we should know about?');

      expect(c.questionClass).toBe(QuestionClass.ATTESTATION);
      expect(c.viaCatalog).toBe(false);
    });

    it('forces a novel immigration phrasing to attestation', () => {
      expect(classify('Describe your current immigration standing').questionClass).toBe(
        QuestionClass.ATTESTATION,
      );
    });

    it('forces a novel protected-characteristic phrasing to demographic', () => {
      expect(classify('What is your sexual orientation?').questionClass).toBe(
        QuestionClass.DEMOGRAPHIC,
      );
      expect(classify('Marital status').questionClass).toBe(QuestionClass.DEMOGRAPHIC);
    });
  });

  describe('unknown questions', () => {
    // The load-bearing test: an unrecognised question must NEVER be treated as
    // prose, because prose is the one class a model is allowed to author.
    it('returns null rather than guessing prose', () => {
      const c = classify('What is your favourite build tool and why do you prefer it?');

      expect(c.questionClass).toBeNull();
      expect(allowsModelDraft(c.questionClass)).toBe(false);
    });

    it('still yields a stable key so the answer can be remembered', () => {
      const a = classify('Describe a time you disagreed with a teammate');
      const b = classify('describe a time you disagreed with a teammate');

      expect(a.questionKey).toBe(b.questionKey);
      expect(a.questionClass).toBeNull();
    });
  });
});

describe('permission helpers', () => {
  it('requires a candidate answer for attestations and demographics', () => {
    expect(requiresCandidateAnswer(QuestionClass.ATTESTATION)).toBe(true);
    expect(requiresCandidateAnswer(QuestionClass.DEMOGRAPHIC)).toBe(true);
    expect(requiresCandidateAnswer(QuestionClass.PROSE)).toBe(false);
    expect(requiresCandidateAnswer(null)).toBe(false);
  });

  it('permits a model draft only for prose', () => {
    expect(allowsModelDraft(QuestionClass.PROSE)).toBe(true);
    expect(allowsModelDraft(QuestionClass.ATTESTATION)).toBe(false);
    expect(allowsModelDraft(QuestionClass.DEMOGRAPHIC)).toBe(false);
    expect(allowsModelDraft(QuestionClass.PREFERENCE)).toBe(false);
    expect(allowsModelDraft(QuestionClass.IDENTITY)).toBe(false);
    expect(allowsModelDraft(null)).toBe(false);
  });

  // Belt and braces: no seeded ATTESTATION/DEMOGRAPHIC row can ever be
  // model-answerable, whatever future edits do to the seed file.
  it('no seeded attestation or demographic row allows a model draft', () => {
    const risky = QUESTION_CATALOG_SEED.filter(
      (q) =>
        q.questionClass === QuestionClass.ATTESTATION ||
        q.questionClass === QuestionClass.DEMOGRAPHIC,
    );

    expect(risky.length).toBeGreaterThan(0);
    expect(risky.every((q) => !allowsModelDraft(q.questionClass))).toBe(true);
  });
});
